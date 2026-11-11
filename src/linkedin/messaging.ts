import type { Page } from 'playwright';
import { SEL, URLS, any } from '../browser/selectors.js';
import { assertLoggedIn } from '../browser/session.js';
import { fillComposer, normalizeText } from '../browser/typing.js';
import type { ImageInput } from '../responder/llm.js';
import type { ConversationSummary, Thread } from '../types.js';
import { type RawThread, threadIdFromUrl, toThread } from './parseThread.js';

export class ReplyOnlyViolation extends Error {}

// Plain strings: these get sent into the page.
const PAGE_SEL = {
  item: any(SEL.conversationItem),
  unread: any(SEL.conversationUnread),
  preview: any(SEL.conversationPreview),
  names: any(SEL.conversationNames),
  event: any(SEL.messageEvent),
  eventItem: any(SEL.eventItem),
  otherClass: SEL.eventFromOtherClass,
  body: any(SEL.eventBody),
  sender: any(SEL.senderName),
  time: any(SEL.timeLabel),
  image: any(SEL.image),
  gif: any(SEL.gif),
  file: any(SEL.file),
  fileName: any(SEL.fileName),
  audio: any(SEL.audio),
  video: any(SEL.video),
  linkPreview: any(SEL.linkPreview),
  linkPreviewTitle: any(SEL.linkPreviewTitle),
  header: any(SEL.threadHeaderNames),
  sponsored: SEL.sponsoredLabel.source,
};

export async function listConversations(page: Page, limit = 8): Promise<ConversationSummary[]> {
  assertLoggedIn(page);
  return page.evaluate(
    ({ s, limit }) =>
      [...document.querySelectorAll(s.item)].slice(0, limit).map((li, index) => {
        const names = li.querySelector(s.names)?.textContent?.trim() ?? '';
        const preview = li.querySelector(s.preview)?.textContent?.trim() ?? '';
        return {
          index,
          key: names,
          signature: `${names}|${preview}`,
          unread: !!li.querySelector(s.unread) || /--unread/.test(li.innerHTML.slice(0, 2000)),
          sponsored: new RegExp(s.sponsored, 'i').test(li.textContent ?? ''),
        };
      }),
    { s: PAGE_SEL, limit },
  );
}

export async function openConversation(page: Page, index: number): Promise<string> {
  await page.locator(PAGE_SEL.item).nth(index).click();
  await page.waitForURL(URLS.existingThread, { timeout: 10_000 });
  await page.locator(PAGE_SEL.event).last().waitFor({ state: 'attached', timeout: 10_000 });
  await page.waitForTimeout(300);
  const id = threadIdFromUrl(page.url());
  if (!id) throw new Error('conversation did not open');
  return id;
}

export async function readThread(page: Page, sponsored = false): Promise<Thread> {
  assertLoggedIn(page);
  const raw: RawThread = await page.evaluate((s) => {
    const txt = (el: Element | null | undefined) => (el as HTMLElement | null)?.innerText?.trim() ?? '';
    let sender = '';
    let time = '';
    const events = [];
    for (const ev of document.querySelectorAll(s.event)) {
      const item = ev.querySelector('[data-event-urn]') ?? ev.querySelector(s.eventItem);
      // Name/time only show on the first message of a group.
      const name = txt(ev.querySelector(s.sender));
      if (name) sender = name;
      const t = txt(ev.querySelector(s.time));
      if (t) time = t;
      if (!item) continue;
      const images = item.querySelectorAll(s.image).length;
      const files = [...item.querySelectorAll(s.file)]
        .filter((a) => !a.querySelector(s.image))
        .map((a) => txt(a.querySelector(s.fileName)) || a.getAttribute('aria-label') || txt(a).split('\n')[0] || '');
      const links = [...item.querySelectorAll(`${s.body} a[href^="http"]`)].map((a) => ({
        url: (a as HTMLAnchorElement).href,
      }));
      const preview = item.querySelector(s.linkPreview);
      if (preview) {
        const a = preview.querySelector('a[href^="http"]') as HTMLAnchorElement | null;
        links.push({ url: a?.href ?? '', ...{ title: txt(preview.querySelector(s.linkPreviewTitle)) || undefined } });
      }
      events.push({
        urn: item.getAttribute('data-event-urn'),
        fromOther: item.classList.contains(s.otherClass),
        sender,
        time,
        text: txt(item.querySelector(s.body)),
        images,
        gif: !!item.querySelector(s.gif),
        files,
        audio: !!item.querySelector(s.audio),
        video: !!item.querySelector(s.video),
        links: links.filter((l) => l.url),
      });
    }
    return { url: location.href, headerTitle: txt(document.querySelector(s.header)), events };
  }, PAGE_SEL);
  return toThread(raw, sponsored);
}

export async function captureImages(page: Page, thread: Thread, messageIds: string[]): Promise<ImageInput[]> {
  const out: ImageInput[] = [];
  for (const m of thread.messages) {
    if (!messageIds.includes(m.id) || !m.attachments.some((a) => a.kind === 'image' || a.kind === 'gif')) continue;
    const imgs = page.locator(`[data-event-urn="${m.id}"]`).locator(PAGE_SEL.image);
    for (const img of (await imgs.all().catch(() => [])).slice(0, 3 - out.length)) {
      const buf = await img.screenshot({ timeout: 5_000, type: 'jpeg', quality: 80 }).catch(() => null);
      if (buf) out.push({ mediaType: 'image/jpeg', data: buf.toString('base64') });
    }
    if (out.length >= 3) break;
  }
  return out;
}

/** Reply-only: refuses unless we're on this existing thread and its newest message is theirs. */
export async function reply(page: Page, threadId: string, text: string, maxTypingMs: number): Promise<void> {
  if (threadIdFromUrl(page.url()) !== threadId) throw new ReplyOnlyViolation('not on the expected existing thread');
  const thread = await readThread(page);
  if (thread.messages.at(-1)?.fromSelf !== false) throw new ReplyOnlyViolation('latest message is not from the other person');

  const box = page.locator(any(SEL.composer)).first();
  for (let attempt = 0; ; attempt++) {
    await fillComposer(page, box, text, maxTypingMs);
    if (normalizeText(await box.innerText()) === normalizeText(text)) break;
    if (attempt === 1) throw new Error('composer does not contain the full reply; not sending');
  }

  const send = page.locator(any(SEL.sendButton)).first();
  for (let attempt = 0; attempt < 2; attempt++) {
    if (attempt === 0) await send.click({ timeout: 5_000 });
    else await page.getByRole('button', { name: SEL.sendButtonName }).first().click({ timeout: 5_000 });
    const sent = await page
      .waitForFunction((sel) => !(document.querySelector(sel) as HTMLElement | null)?.innerText.trim(), any(SEL.composer), {
        timeout: 6_000,
      })
      .then(() => true)
      .catch(() => false);
    if (sent) return;
  }
  throw new Error('message did not leave the composer');
}
