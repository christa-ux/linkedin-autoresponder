import type { Thread, ThreadMessage } from '../src/types.js';

let n = 0;
/** Synthetic data only. */
export function msg(text: string, opts: Partial<ThreadMessage> = {}): ThreadMessage {
  n += 1;
  return { id: `m${n}`, fromSelf: false, senderName: 'Test Sender', text, timeLabel: '10:00', attachments: [], links: [], ...opts };
}
export const me = (text: string, opts: Partial<ThreadMessage> = {}) => msg(text, { fromSelf: true, senderName: 'Bot Owner', ...opts });

export function thread(messages: ThreadMessage[], opts: Partial<Thread> = {}): Thread {
  return { id: 't1', isGroup: false, isSponsored: false, otherName: 'Test Sender', messages, ...opts };
}
