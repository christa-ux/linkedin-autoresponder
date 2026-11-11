/**
 * One-time manual login. Opens a real browser window on the persistent profile;
 * you type your credentials / 2FA yourself. Nothing is read or stored by this script
 * except the browser's own profile directory (git-ignored).
 */
import { config } from '../src/config.js';
import { isBlocked, openContext } from '../src/browser/session.js';
import { URLS } from '../src/browser/selectors.js';

const ctx = await openContext(config.USER_DATA_DIR, false);
const page = ctx.pages()[0] ?? (await ctx.newPage());
await page.goto(URLS.feed);
if (isBlocked(page.url())) {
  console.log('Log in to LinkedIn in the browser window (incl. any 2FA). Waiting up to 10 minutes…');
  await page.waitForURL((u) => u.pathname.startsWith('/feed'), { timeout: 10 * 60_000 });
}
console.log('Logged in. Session saved to', config.USER_DATA_DIR, '- you can close the window.');
await ctx.close();
