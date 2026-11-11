import type { Page } from 'playwright';
import { logger } from '../logger.js';
import { dismissModals } from '../browser/dismissModals.js';
import { SEL, URLS, any } from '../browser/selectors.js';
import { gotoChecked } from '../browser/session.js';

/**
 * Reload the received-invitations page and click every Accept right away.
 * Returns an opaque key per accepted invite (the button label; the caller hashes it before storing).
 * Never sends a message after accepting (reply-only rule).
 */
export async function acceptPendingInvitations(page: Page): Promise<string[]> {
  await gotoChecked(page, URLS.invitations);
  const accept = page.getByRole('button', { name: SEL.acceptButtonName });
  // Either an Accept button shows up, or the page is simply empty: don't wait the full timeout twice.
  await accept.first().waitFor({ state: 'visible', timeout: 6_000 }).catch(() => undefined);
  await dismissModals(page);

  const accepted: string[] = [];
  // Re-query after each click: the list re-renders when a card is accepted.
  for (let guard = 0; guard < 25; guard++) {
    const buttons = await accept.all();
    let clicked = false;
    for (const btn of buttons) {
      if (!(await btn.isVisible().catch(() => false))) continue;
      const label = ((await btn.getAttribute('aria-label')) ?? (await btn.textContent()) ?? '').trim();
      if (SEL.nonPersonInvite.test(label)) continue;
      await btn.click({ timeout: 5_000 });
      await btn.waitFor({ state: 'detached', timeout: 5_000 }).catch(() => undefined);
      accepted.push(label || `invite-${Date.now()}`);
      logger.info({ count: accepted.length }, 'accepted invitation');
      clicked = true;
      await dismissModals(page); // e.g. a "say hello" prompt; we never use it
      break;
    }
    if (!clicked) break;
  }
  if (accepted.length === 0) logger.debug({ cards: await page.locator(any(SEL.invitationCard)).count() }, 'no invitations to accept');
  return accepted;
}
