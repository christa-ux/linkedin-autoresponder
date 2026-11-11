import { describe, expect, it } from 'vitest';
import { MessagesJob } from '../src/jobs/messagesJob.js';
import type { LinkedInClient } from '../src/linkedin/LinkedInClient.js';
import { MockLlm } from '../src/responder/llm.js';
import { Responder } from '../src/responder/responder.js';
import { openDb } from '../src/state/db.js';
import { Repo } from '../src/state/repo.js';
import type { Thread } from '../src/types.js';
import { me, msg, thread } from './helpers.js';

function fakeClient(t: Thread) {
  const sent: string[] = [];
  const client: LinkedInClient = {
    acceptPendingInvitations: async () => [],
    listConversations: async () => [{ index: 0, key: 'k', signature: `k|${t.messages.at(-1)?.text}`, unread: true, sponsored: false }],
    openConversation: async () => t.id,
    readThread: async () => t,
    captureImages: async () => [],
    reply: async (_id, text) => {
      sent.push(text);
      t.messages.push(me(text));
    },
  };
  return { client, sent };
}

const settings = { BURST_SETTLE_MS: 0, BURST_MAX_WAIT_MS: 1, DRY_RUN: false };
const persona = { name: 'Bot Owner', firstName: 'Bot', headline: '', facts: [] };

describe('MessagesJob', () => {
  it('answers a burst once and never twice (also across restarts)', async () => {
    const t = thread([msg('hey'), msg('are you there?')]);
    const { client, sent } = fakeClient(t);
    const repo = new Repo(openDb(':memory:'));
    const llm = new MockLlm(() => 'Hey! Yes, what is up?');
    await new MessagesJob(client, new Responder(llm, persona), repo, settings).tick();
    expect(sent).toEqual(['Hey! Yes, what is up?']);

    // simulated restart with the same DB
    t.messages.pop();
    await new MessagesJob(client, new Responder(llm, persona), repo, settings).tick();
    expect(sent).toHaveLength(1);
  });

  it('does not reply when we spoke last', async () => {
    const { client, sent } = fakeClient(thread([msg('hey'), me('hi')]));
    await new MessagesJob(client, new Responder(new MockLlm(() => 'x'), persona), new Repo(openDb(':memory:')), settings).tick();
    expect(sent).toEqual([]);
  });

  it('DRY_RUN never sends', async () => {
    const { client, sent } = fakeClient(thread([msg('hey')]));
    await new MessagesJob(client, new Responder(new MockLlm(() => 'Hey!'), persona), new Repo(openDb(':memory:')), { ...settings, DRY_RUN: true }).tick();
    expect(sent).toEqual([]);
  });
});
