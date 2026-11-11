import { describe, expect, it } from 'vitest';
import { burstSettled, shouldReply, trailingBurst } from '../src/responder/shouldReply.js';
import { me, msg, thread } from './helpers.js';

const none = () => false;

describe('shouldReply (reply-only gate)', () => {
  it('replies when the last message is theirs', () => {
    const d = shouldReply(thread([msg('hey')]), none);
    expect(d.reply).toBe(true);
  });
  it('never replies when the last message is ours', () => {
    expect(shouldReply(thread([msg('hey'), me('hi!')]), none)).toEqual({ reply: false, reason: 'last_is_self' });
  });
  it('empty thread', () => expect(shouldReply(thread([]), none)).toMatchObject({ reply: false, reason: 'empty' }));
  it('skips group threads', () =>
    expect(shouldReply(thread([msg('hey')], { isGroup: true }), none)).toMatchObject({ reply: false, reason: 'group' }));
  it('skips sponsored threads', () =>
    expect(shouldReply(thread([msg('buy')], { isSponsored: true }), none)).toMatchObject({ reply: false, reason: 'sponsored' }));
  it('skips when every burst message is already handled (restart de-dup)', () => {
    const a = msg('one');
    const b = msg('two');
    expect(shouldReply(thread([a, b]), (k) => [a.id, b.id].includes(k))).toMatchObject({ reply: false, reason: 'already_handled' });
  });
  it('replies if one new message joined a handled burst', () => {
    const a = msg('one');
    const b = msg('two');
    const d = shouldReply(thread([a, b]), (k) => k === a.id);
    expect(d.reply && d.burst.map((m) => m.id)).toEqual([a.id, b.id]);
  });
  it('ignores deleted-message placeholders', () =>
    expect(shouldReply(thread([msg('This message has been deleted.')]), none)).toMatchObject({ reason: 'no_content' }));
  it('attachment with no text still gets a reply', () =>
    expect(shouldReply(thread([msg('', { attachments: [{ kind: 'image' }] })]), none).reply).toBe(true));
});

describe('burst', () => {
  it('takes all their messages since our last reply', () => {
    const msgs = [msg('old'), me('reply'), msg('a'), msg('b'), msg('c')];
    expect(trailingBurst(msgs).map((m) => m.text)).toEqual(['a', 'b', 'c']);
  });
  it('whole thread when we never replied', () => expect(trailingBurst([msg('a'), msg('b')])).toHaveLength(2));

  it('settles after quiet period', () => {
    expect(burstSettled({ firstSeenAt: 0, lastChangeAt: 0, now: 4999, settleMs: 5000, maxWaitMs: 15000 })).toBe(false);
    expect(burstSettled({ firstSeenAt: 0, lastChangeAt: 0, now: 5000, settleMs: 5000, maxWaitMs: 15000 })).toBe(true);
  });
  it('never waits past max even if messages keep coming', () => {
    expect(burstSettled({ firstSeenAt: 0, lastChangeAt: 14000, now: 15000, settleMs: 5000, maxWaitMs: 15000 })).toBe(true);
  });
});
