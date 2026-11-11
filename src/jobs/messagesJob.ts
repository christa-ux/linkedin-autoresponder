import type { Config } from '../config.js';
import { logger } from '../logger.js';
import type { LinkedInClient } from '../linkedin/LinkedInClient.js';
import type { Reply, Responder } from '../responder/responder.js';
import { type ReplyDecision, burstSettled, shouldReply } from '../responder/shouldReply.js';
import type { Repo } from '../state/repo.js';
import type { ConversationSummary, Thread, ThreadMessage } from '../types.js';
import { sleep } from './runLoop.js';

type Settings = Pick<Config, 'BURST_SETTLE_MS' | 'BURST_MAX_WAIT_MS' | 'DRY_RUN'>;
type Burst = Extract<ReplyDecision, { reply: true }>;

export class MessagesJob {
  /** In memory only; the DB de-dups across restarts. */
  private readonly seen = new Map<string, string>();

  constructor(
    private readonly client: LinkedInClient,
    private readonly responder: Responder,
    private readonly repo: Repo,
    private readonly cfg: Settings,
  ) {}

  readonly tick = async (): Promise<void> => {
    const conversations = await this.client.listConversations();
    for (const c of conversations) {
      if (!c.unread && this.seen.get(c.key) === c.signature) continue;
      await this.handle(c);
    }
  };

  private decide(thread: Thread): ReplyDecision {
    return shouldReply(thread, (id) => this.repo.isHandled(id));
  }

  private async handle(c: ConversationSummary): Promise<void> {
    const threadId = await this.client.openConversation(c.index);
    let thread = await this.client.readThread(c.sponsored);
    let decision = this.decide(thread);
    if (!decision.reply) {
      logger.debug({ reason: decision.reason }, 'no reply needed');
      this.seen.set(c.key, c.signature);
      return;
    }
    const detectedAt = Date.now();

    let burst: Burst = decision;
    let lastChangeAt = detectedAt;
    while (!burstSettled({ firstSeenAt: detectedAt, lastChangeAt, now: Date.now(), settleMs: this.cfg.BURST_SETTLE_MS, maxWaitMs: this.cfg.BURST_MAX_WAIT_MS })) {
      await sleep(800);
      thread = await this.client.readThread(c.sponsored);
      decision = this.decide(thread);
      if (!decision.reply) return; // the owner answered by hand
      if (decision.burst.length !== burst.burst.length) lastChangeAt = Date.now();
      burst = decision;
    }

    let reply = await this.generate(threadId, thread, burst.burst);

    // Fold in messages that arrived while the reply was being written.
    const latest = await this.client.readThread(c.sponsored);
    const recheck = this.decide(latest);
    if (!recheck.reply) return;
    if (recheck.burst.length !== burst.burst.length) {
      burst = recheck;
      reply = await this.generate(threadId, latest, burst.burst);
    }

    if (this.cfg.DRY_RUN) {
      // Don't mark handled: a real run must still answer.
      logger.info({ text: reply.text, tags: [...reply.classification.tags], source: reply.source }, 'DRY_RUN: would send');
      this.seen.set(c.key, c.signature);
      return;
    }
    await this.client.reply(threadId, reply.text);

    this.repo.markHandled(threadId, burst.burst.map((m) => m.id));
    if (reply.classification.tags.has('rude')) this.repo.incrementRude(threadId);
    this.seen.delete(c.key);
    logger.info(
      {
        latencyMs: Date.now() - detectedAt,
        messages: burst.burst.length,
        tags: [...reply.classification.tags],
        language: reply.classification.language,
        source: reply.source,
        replyLength: reply.text.length,
      },
      'replied',
    );
  }

  private async generate(threadId: string, thread: Thread, burst: ThreadMessage[]): Promise<Reply> {
    const images = await this.client.captureImages(thread, burst.map((m) => m.id)).catch(() => []);
    return this.responder.respond({ thread, burst, images, rudeCount: this.repo.rudeCount(threadId) });
  }
}
