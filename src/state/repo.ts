import { createHash } from 'node:crypto';
import type { DB } from './db.js';

export const hash = (s: string): string => createHash('sha256').update(s).digest('hex');

/** Keys are hashed: the DB never holds message content or names. */
export class Repo {
  constructor(private readonly db: DB) {}

  isHandled(messageKey: string): boolean {
    return !!this.db.prepare('SELECT 1 FROM handled_messages WHERE key = ?').get(hash(messageKey));
  }

  markHandled(threadId: string, messageKeys: string[], now = Date.now()): void {
    const stmt = this.db.prepare(
      'INSERT OR IGNORE INTO handled_messages (key, thread_key, handled_at) VALUES (?, ?, ?)',
    );
    const tk = hash(threadId);
    this.db.transaction(() => {
      for (const k of messageKeys) stmt.run(hash(k), tk, now);
      this.db
        .prepare(
          `INSERT INTO thread_state (thread_key, last_reply_at) VALUES (?, ?)
           ON CONFLICT(thread_key) DO UPDATE SET last_reply_at = excluded.last_reply_at`,
        )
        .run(tk, now);
    })();
  }

  isInviteAccepted(inviteKey: string): boolean {
    return !!this.db.prepare('SELECT 1 FROM accepted_invites WHERE key = ?').get(hash(inviteKey));
  }

  markInviteAccepted(inviteKey: string, now = Date.now()): void {
    this.db.prepare('INSERT OR IGNORE INTO accepted_invites (key, accepted_at) VALUES (?, ?)').run(hash(inviteKey), now);
  }

  rudeCount(threadId: string): number {
    const row = this.db.prepare('SELECT rude_count FROM thread_state WHERE thread_key = ?').get(hash(threadId)) as
      | { rude_count: number }
      | undefined;
    return row?.rude_count ?? 0;
  }

  incrementRude(threadId: string): void {
    this.db
      .prepare(
        `INSERT INTO thread_state (thread_key, rude_count) VALUES (?, 1)
         ON CONFLICT(thread_key) DO UPDATE SET rude_count = rude_count + 1`,
      )
      .run(hash(threadId));
  }
}
