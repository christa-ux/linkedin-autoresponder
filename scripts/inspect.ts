/**
 * Debug helper: checks every selector in src/browser/selectors.ts against the live pages and
 * prints only COUNTS and CSS classes (no names, no message text) so output is safe to share.
 * `npm run inspect -- --dump` also writes HTML + screenshots to git-ignored screenshots/.
 * Stop the bot first: a persistent profile can only be opened by one browser at a time.
 */
import fs from 'node:fs';
import type { Page } from 'playwright';
import { config } from '../src/config.js';
import { SEL, URLS } from '../src/browser/selectors.js';
import { assertLoggedIn, openContext } from '../src/browser/session.js';

const dump = process.argv.includes('--dump');
const ctx = await openContext(config.USER_DATA_DIR, false);
const page = ctx.pages()[0] ?? (await ctx.newPage());

async function report(p: Page, title: string, keys: Array<keyof typeof SEL>) {
  console.log(`\n=== ${title}  (${new URL(p.url()).pathname})`);
  for (const key of keys) {
    const value = SEL[key];
    if (!Array.isArray(value)) continue;
    for (const sel of value as readonly string[]) {
      const n = await p.locator(sel).count();
      console.log(`${n > 0 ? '✓' : '·'} ${String(key).padEnd(20)} ${String(n).padStart(3)}  ${sel}`);
    }
  }
}

async function save(p: Page, name: string) {
  if (!dump) return;
  fs.mkdirSync('screenshots', { recursive: true });
  fs.writeFileSync(`screenshots/${name}.html`, await p.content());
  await p.screenshot({ path: `screenshots/${name}.png`, fullPage: true });
  console.log(`  dumped screenshots/${name}.{html,png}`);
}

// Invitations
await page.goto(URLS.invitations, { waitUntil: 'domcontentloaded' });
assertLoggedIn(page);
await page.waitForTimeout(4000);
await report(page, 'Invitations', ['invitationCard', 'modalDismiss']);
const accepts = page.getByRole('button', { name: SEL.acceptButtonName });
console.log(`${(await accepts.count()) > 0 ? '✓' : '·'} accept buttons (role)  ${await accepts.count()}`);
await save(page, 'invitations');

// Messaging list + first thread
await page.goto(URLS.messaging, { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(5000);
await report(page, 'Messaging list', ['conversationItem', 'conversationLink', 'conversationUnread', 'conversationPreview', 'conversationNames']);
await save(page, 'messaging');
await report(page, 'Open thread', [
  'messageList', 'messageEvent', 'eventItem', 'eventBody', 'senderName', 'timeLabel',
  'image', 'gif', 'file', 'fileName', 'audio', 'video', 'linkPreview', 'threadHeaderNames', 'composer', 'sendButton',
]);
const urns = await page.locator('[data-event-urn]').count();
const other = await page.locator(`.${SEL.eventFromOtherClass}`).count();
console.log(`  events with data-event-urn: ${urns}, marked as other person: ${other}`);
const send = page.getByRole('button', { name: SEL.sendButtonName });
console.log(`  send button (role): ${await send.count()}`);

// Class names of the first event item: lets us fix selectors without exposing content.
const classes = await page
  .locator(SEL.messageEvent.join(', '))
  .first()
  .evaluate((el) => [...new Set([...el.querySelectorAll('*')].flatMap((e) => [...e.classList]))].filter((c) => c.startsWith('msg-')).slice(0, 60))
  .catch(() => []);
console.log('  msg-* classes inside first event:', classes.join(' '));

console.log('\nDone. Close the window or press Ctrl+C.');
await ctx.close();
