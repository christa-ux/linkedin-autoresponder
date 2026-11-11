import { config } from './config.js';
import { logger } from './logger.js';
import { URLS } from './browser/selectors.js';
import { SessionError, gotoChecked, openContext, readSelf } from './browser/session.js';

async function main(): Promise<void> {
  logger.info({ dryRun: config.DRY_RUN, headless: config.HEADLESS }, 'starting');
  const ctx = await openContext(config.USER_DATA_DIR, config.HEADLESS);

  const invitesTab = ctx.pages()[0] ?? (await ctx.newPage());
  const self = await readSelf(invitesTab);
  logger.info({ profileUrl: self.profileUrl }, `Logged in as ${self.name || '(name not found)'}`);

  // Two long-lived tabs: A = invitations, B = messaging.
  await gotoChecked(invitesTab, URLS.invitations);
  const messagesTab = await ctx.newPage();
  await gotoChecked(messagesTab, URLS.messaging);
  logger.info('invitations and messaging tabs open');

  const shutdown = async (signal: string) => {
    logger.info({ signal }, 'shutting down');
    await ctx.close().catch(() => undefined);
    process.exit(0);
  };
  process.on('SIGINT', () => void shutdown('SIGINT'));
  process.on('SIGTERM', () => void shutdown('SIGTERM'));
}

main().catch((err) => {
  if (err instanceof SessionError) logger.fatal(err.message);
  else logger.fatal({ err }, 'fatal startup error');
  process.exit(1);
});
