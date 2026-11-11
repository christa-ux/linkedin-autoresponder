import fs from 'node:fs';
import { chromium, type BrowserContext, type Page } from 'playwright';
import { BLOCKED_URL, SEL, URLS, any } from './selectors.js';

export class SessionError extends Error {
  constructor(url: string) {
    super(`LinkedIn session is not usable (redirected to ${new URL(url).pathname}). Stop the bot and run \`npm run login\`.`);
  }
}

export interface Self {
  name: string;
  profileUrl: string;
}

export async function openContext(userDataDir: string, headless: boolean): Promise<BrowserContext> {
  fs.mkdirSync(userDataDir, { recursive: true, mode: 0o700 });
  fs.chmodSync(userDataDir, 0o700);
  const ctx = await chromium.launchPersistentContext(userDataDir, {
    headless,
    viewport: { width: 1280, height: 900 },
  });
  // tsx injects __name() into functions sent to page.evaluate; define it in the page.
  await ctx.addInitScript('globalThis.__name = globalThis.__name || ((fn) => fn);');
  ctx.setDefaultTimeout(15_000);
  ctx.setDefaultNavigationTimeout(45_000);
  return ctx;
}

export function isBlocked(url: string): boolean {
  return BLOCKED_URL.test(url);
}

export function assertLoggedIn(page: Page): void {
  if (isBlocked(page.url())) throw new SessionError(page.url());
}

export async function gotoChecked(page: Page, url: string): Promise<void> {
  await page.goto(url, { waitUntil: 'domcontentloaded' });
  assertLoggedIn(page);
}

export async function readSelf(page: Page): Promise<Self> {
  await gotoChecked(page, URLS.me);
  await page.waitForURL(/\/in\/(?!me\/)[^/]+/, { timeout: 20_000 }).catch(() => undefined);
  let name = (await page.locator(any(SEL.profileName)).first().textContent({ timeout: 5_000 }).catch(() => ''))?.trim() ?? '';
  if (!name) name = nameFromTitle(await page.title());
  return { name, profileUrl: page.url().split('?')[0]! };
}

/** "(3) Jane Doe | LinkedIn" -> "Jane Doe" */
export function nameFromTitle(title: string): string {
  return title.replace(/^\(\d+\+?\)\s*/, '').replace(/\s*\|\s*LinkedIn\s*$/i, '').trim();
}
