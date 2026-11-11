import { config } from './config.js';
import { logger } from './logger.js';
import { URLS } from './browser/selectors.js';
import { errorScreenshot } from './browser/screenshots.js';
import { SessionError, gotoChecked, openContext, readSelf } from './browser/session.js';
import { invitationsTick } from './jobs/invitationsJob.js';
import { MessagesJob } from './jobs/messagesJob.js';
import { PlaywrightClient } from './linkedin/LinkedInClient.js';
import { AnthropicLlm } from './responder/llm.js';
import { buildPersona } from './responder/persona.js';
import { Responder } from './responder/responder.js';
import { runLoop } from './jobs/runLoop.js';
import { openDb } from './state/db.js';
import { Repo } from './state/repo.js';

let stopped = false;

async function main(): Promise<void> {
  logger.info({ dryRun: config.DRY_RUN, headless: config.HEADLESS }, 'starting');
  const repo = new Repo(openDb(config.DB_PATH));
  const ctx = await openContext(config.USER_DATA_DIR, config.HEADLESS);

  const invitesTab = ctx.pages()[0] ?? (await ctx.newPage());
  const self = await readSelf(invitesTab);
  logger.info({ profileUrl: self.profileUrl }, `Logged in as ${self.name || '(name not found)'}`);

  const messagesTab = await ctx.newPage();
  await gotoChecked(messagesTab, URLS.messaging);

  const shutdown = async (signal: string) => {
    logger.info({ signal }, 'shutting down');
    stopped = true;
    await ctx.close().catch(() => undefined);
    process.exit(0);
  };
  process.on('SIGINT', () => void shutdown('SIGINT'));
  process.on('SIGTERM', () => void shutdown('SIGTERM'));

  if (!config.ANTHROPIC_API_KEY) logger.warn('ANTHROPIC_API_KEY not set: using the `ant auth login` profile if present (check with `ant auth status`)');
  const llm = new AnthropicLlm(config.LLM_MODEL, config.LLM_FALLBACK_MODEL, config.LLM_TIMEOUT_MS, config.ANTHROPIC_API_KEY);
  const responder = new Responder(llm, buildPersona(config, self.name));
  const client = new PlaywrightClient(invitesTab, messagesTab, config.MAX_TYPING_MS);
  const messages = new MessagesJob(client, responder, repo, config);

  await Promise.all([
    runLoop('invitations', config.INVITES_POLL_SECONDS * 1000, invitationsTick(invitesTab, repo), {
      isStopped: () => stopped,
      onError: () => errorScreenshot(invitesTab, 'invitations'),
    }),
    runLoop('messages', config.MESSAGES_POLL_SECONDS * 1000, messages.tick, {
      isStopped: () => stopped,
      onError: async () => {
        await errorScreenshot(messagesTab, 'messages');
        await gotoChecked(messagesTab, URLS.messaging);
      },
    }),
  ]);
}

main().catch((err) => {
  if (err instanceof SessionError) logger.fatal(err.message);
  else logger.fatal({ err }, 'fatal startup error');
  process.exit(1);
});
