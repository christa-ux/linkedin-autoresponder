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

/**
 * Persistent profile = the logged-in session. The directory holds LinkedIn cookies, so it is
 * git-ignored and locked to the current OS user (0700). No stealth flags: we don't hide automation.
 */
export async function openContext(userDataDir: string, headless: boolean): Promise<BrowserContext> {
  fs.mkdirSync(userDataDir, { recursive: true, mode: 0o700 });
  fs.chmodSync(userDataDir, 0o700);
  const ctx = await chromium.launchPersistentContext(userDataDir, {
    headless,
    viewport: { width: 1280, height: 900 },
  });
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

/** Navigate, then make sure LinkedIn didn't bounce us to login / checkpoint. */
export async function gotoChecked(page: Page, url: string): Promise<void> {
  await page.goto(url, { waitUntil: 'domcontentloaded' });
  assertLoggedIn(page);
}

/** Our own name and profile URL, used to tell "me" from "them". */
export async function readSelf(page: Page): Promise<Self> {
  await gotoChecked(page, URLS.me);
  await page.waitForURL(/\/in\/(?!me\/)[^/]+/, { timeout: 20_000 }).catch(() => undefined);
  let name = (await page.locator(any(SEL.profileName)).first().textContent({ timeout: 5_000 }).catch(() => ''))?.trim() ?? '';
  if (!name) name = nameFromTitle(await page.title());
  return { name, profileUrl: page.url().split('?')[0]! };
}

/** Profile tab titles look like "(3) Jane Doe | LinkedIn"; more stable than the page markup. */
export function nameFromTitle(title: string): string {
  return title.replace(/^\(\d+\+?\)\s*/, '').replace(/\s*\|\s*LinkedIn\s*$/i, '').trim();
}
