import type { Page } from 'playwright';
import { logger } from '../logger.js';
import { acceptPendingInvitations } from '../linkedin/invitations.js';
import type { Repo } from '../state/repo.js';

export function invitationsTick(page: Page, repo: Repo) {
  return async (): Promise<void> => {
    const accepted = await acceptPendingInvitations(page);
    for (const key of accepted) repo.markInviteAccepted(key);
    if (accepted.length) logger.info({ accepted: accepted.length }, 'invitations tick');
  };
}
