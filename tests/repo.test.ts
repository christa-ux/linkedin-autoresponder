import { describe, expect, it } from 'vitest';
import { openDb } from '../src/state/db.js';
import { Repo } from '../src/state/repo.js';

describe('Repo', () => {
  it('de-dups handled messages and stores only hashes', () => {
    const db = openDb(':memory:');
    const repo = new Repo(db);
    expect(repo.isHandled('urn:a')).toBe(false);
    repo.markHandled('thread-1', ['urn:a', 'urn:b']);
    repo.markHandled('thread-1', ['urn:a']); // idempotent
    expect(repo.isHandled('urn:a')).toBe(true);
    expect(repo.isHandled('urn:b')).toBe(true);
    const rows = db.prepare('SELECT key, thread_key FROM handled_messages').all() as Array<{ key: string; thread_key: string }>;
    expect(rows).toHaveLength(2);
    for (const r of rows) {
      expect(r.key).toMatch(/^[0-9a-f]{64}$/);
      expect(r.thread_key).not.toContain('thread-1');
    }
  });
  it('tracks invitations and rude counts', () => {
    const repo = new Repo(openDb(':memory:'));
    repo.markInviteAccepted('inv');
    expect(repo.isInviteAccepted('inv')).toBe(true);
    expect(repo.rudeCount('t')).toBe(0);
    repo.incrementRude('t');
    repo.incrementRude('t');
    expect(repo.rudeCount('t')).toBe(2);
  });
});
