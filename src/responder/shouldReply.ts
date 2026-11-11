import type { Thread, ThreadMessage } from '../types.js';

export type SkipReason = 'group' | 'sponsored' | 'empty' | 'last_is_self' | 'already_handled' | 'no_content';

export type ReplyDecision = { reply: true; burst: ThreadMessage[] } | { reply: false; reason: SkipReason };

const DELETED_RE = /^(this message has been deleted\.?|ce message a été supprimé\.?)$/i;

/** Reply-only gate: the newest message must be theirs and not yet handled. */
export function shouldReply(thread: Thread, isHandled: (key: string) => boolean): ReplyDecision {
  if (thread.isGroup) return { reply: false, reason: 'group' };
  if (thread.isSponsored) return { reply: false, reason: 'sponsored' };
  const last = thread.messages.at(-1);
  if (!last) return { reply: false, reason: 'empty' };
  if (last.fromSelf) return { reply: false, reason: 'last_is_self' };

  const burst = trailingBurst(thread.messages);
  if (burst.every((m) => isHandled(m.id))) return { reply: false, reason: 'already_handled' };

  const meaningful = burst.filter((m) => m.attachments.length > 0 || (m.text.trim() && !DELETED_RE.test(m.text.trim())));
  if (meaningful.length === 0) return { reply: false, reason: 'no_content' };
  return { reply: true, burst: meaningful };
}

export function trailingBurst(messages: ThreadMessage[]): ThreadMessage[] {
  let i = messages.length;
  while (i > 0 && !messages[i - 1]!.fromSelf) i--;
  return messages.slice(i);
}

export interface SettleState {
  firstSeenAt: number;
  lastChangeAt: number;
  now: number;
  settleMs: number;
  maxWaitMs: number;
}

export function burstSettled(s: SettleState): boolean {
  return s.now - s.lastChangeAt >= s.settleMs || s.now - s.firstSeenAt >= s.maxWaitMs;
}
