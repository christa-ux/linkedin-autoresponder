import { config } from './config.js';
import { logger } from './logger.js';
import { URLS } from './browser/selectors.js';
import { errorScreenshot } from './browser/screenshots.js';
import { SessionError, gotoChecked, openContext, readSelf } from './browser/session.js';
import { invitationsTick } from './jobs/invitationsJob.js';
import { MessagesJob } from './jobs/messagesJob.js';
import { notifyHuman, runLoop } from './jobs/runLoop.js';
import { keepAwake } from './keepAwake.js';
import { PlaywrightClient } from './linkedin/LinkedInClient.js';
import { AnthropicLlm } from './responder/llm.js';
import { buildPersona } from './responder/persona.js';
import { Responder } from './responder/responder.js';
import { openDb } from './state/db.js';
import { Repo } from './state/repo.js';
import { startWatchdog } from './watchdog.js';

const TAB_REFRESH_MS = 30 * 60_000;
const LLM_CHECK_MS = 30 * 60_000;

let stopped = false;

process.on('unhandledRejection', (err) => logger.error({ err: (err as Error)?.message }, 'unhandled rejection'));
process.on('uncaughtException', (err) => {
  logger.fatal({ err: err.message }, 'uncaught exception, exiting for pm2 restart');
  process.exit(1);
});

async function checkLlm(llm: AnthropicLlm): Promise<void> {
  try {
    await llm.check();
    logger.info('Claude API reachable');
  } catch (err) {
    logger.error({ err: (err as Error).message }, 'Claude API check FAILED: replies will be fallback lines only');
    notifyHuman('Claude API check failed: check credits / `ant auth status`.');
  }
}

async function main(): Promise<void> {
  logger.info({ dryRun: config.DRY_RUN, headless: config.HEADLESS }, 'starting');
  keepAwake();
  const repo = new Repo(openDb(config.DB_PATH));
  const ctx = await openContext(config.USER_DATA_DIR, config.HEADLESS);
  ctx.on('close', () => {
    if (stopped) return;
    logger.fatal('browser closed unexpectedly, exiting for pm2 restart');
    process.exit(1);
  });

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

  if (!config.ANTHROPIC_API_KEY) logger.warn('ANTHROPIC_API_KEY not set: using the `ant auth login` profile');
  const llm = new AnthropicLlm(config.LLM_MODEL, config.LLM_FALLBACK_MODEL, config.LLM_TIMEOUT_MS, config.ANTHROPIC_API_KEY);
  await checkLlm(llm);
  setInterval(() => void checkLlm(llm), LLM_CHECK_MS);

  const responder = new Responder(llm, buildPersona(config, self.name));
  const client = new PlaywrightClient(invitesTab, messagesTab, config.MAX_TYPING_MS);
  const messages = new MessagesJob(client, responder, repo, config);
  const reloadMessages = () => gotoChecked(messagesTab, URLS.messaging);

  // A messages tick can legitimately take ~80 s (burst wait + two LLM attempts + typing).
  startWatchdog([
    { name: 'invitations', softMs: 120_000, hardMs: 240_000, reload: () => gotoChecked(invitesTab, URLS.invitations) },
    { name: 'messages', softMs: 120_000, hardMs: 240_000, reload: reloadMessages },
  ]);

  let lastRefresh = Date.now();
  const messagesTick = async () => {
    // Long-lived SPA tabs grow in memory; a periodic reload keeps 24 h runs stable.
    if (Date.now() - lastRefresh > TAB_REFRESH_MS) {
      lastRefresh = Date.now();
      await reloadMessages();
      logger.info('messaging tab refreshed');
    }
    await messages.tick();
    logger.debug('heartbeat');
  };

  await Promise.all([
    runLoop('invitations', config.INVITES_POLL_SECONDS * 1000, invitationsTick(invitesTab, repo), {
      isStopped: () => stopped,
      onError: () => errorScreenshot(invitesTab, 'invitations'),
    }),
    runLoop('messages', config.MESSAGES_POLL_SECONDS * 1000, messagesTick, {
      isStopped: () => stopped,
      onError: async () => {
        await errorScreenshot(messagesTab, 'messages');
        await reloadMessages();
      },
    }),
  ]);
}

main().catch((err) => {
  if (err instanceof SessionError) {
    logger.fatal(err.message);
    notifyHuman('LinkedIn session expired or checkpoint: run `npm run login`.');
  } else logger.fatal({ err }, 'fatal startup error');
  process.exit(1);
});
