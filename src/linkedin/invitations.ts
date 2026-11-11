import type { Page } from 'playwright';
import { logger } from '../logger.js';
import { dismissModals } from '../browser/dismissModals.js';
import { SEL, URLS, any } from '../browser/selectors.js';
import { gotoChecked } from '../browser/session.js';

/** Accepts every person invitation. Never sends a message afterwards. */
export async function acceptPendingInvitations(page: Page): Promise<string[]> {
  await gotoChecked(page, URLS.invitations);
  const accept = page.getByRole('button', { name: SEL.acceptButtonName });
  await accept.first().waitFor({ state: 'visible', timeout: 6_000 }).catch(() => undefined);
  await dismissModals(page);

  const accepted: string[] = [];
  // The list re-renders after each accept.
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
      await dismissModals(page);
      break;
    }
    if (!clicked) break;
  }
  if (accepted.length === 0) logger.debug({ cards: await page.locator(any(SEL.invitationCard)).count() }, 'no invitations to accept');
  return accepted;
}
