import Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';

export type DB = Database.Database;

const SCHEMA = `
CREATE TABLE IF NOT EXISTS handled_messages (
  key        TEXT PRIMARY KEY,   -- sha256 of the message key; no content stored
  thread_key TEXT NOT NULL,
  handled_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS accepted_invites (
  key         TEXT PRIMARY KEY,  -- sha256 of the invitation identity
  accepted_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS thread_state (
  thread_key    TEXT PRIMARY KEY,
  rude_count    INTEGER NOT NULL DEFAULT 0,
  last_reply_at INTEGER
);
`;

export function openDb(file: string): DB {
  if (file !== ':memory:') {
    fs.mkdirSync(path.dirname(file), { recursive: true, mode: 0o700 });
  }
  const db = new Database(file);
  db.pragma('journal_mode = WAL');
  db.exec(SCHEMA);
  return db;
}
