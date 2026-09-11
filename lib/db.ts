import { env } from 'cloudflare:workers';
import { drizzle } from 'drizzle-orm/d1';

export function database() {
  return drizzle(env.DB as D1Database);
}

export async function ensureDatabase() {
  const db = env.DB as D1Database;
  await db.batch([
    db.prepare('CREATE TABLE IF NOT EXISTS tasks (id INTEGER PRIMARY KEY AUTOINCREMENT, title TEXT NOT NULL, completed INTEGER NOT NULL DEFAULT 0, source TEXT NOT NULL DEFAULT \'web\', external_id TEXT UNIQUE, created_at INTEGER NOT NULL)'),
    db.prepare('CREATE INDEX IF NOT EXISTS idx_tasks_completed_created_at ON tasks (completed, created_at DESC)'),
    db.prepare('CREATE TABLE IF NOT EXISTS sync_state (key TEXT PRIMARY KEY, value TEXT NOT NULL)'),
    db.prepare('CREATE TABLE IF NOT EXISTS sleep_records (sleep_date TEXT PRIMARY KEY, start_at INTEGER NOT NULL, end_at INTEGER NOT NULL, total_minutes INTEGER NOT NULL, awake_minutes INTEGER, rem_minutes INTEGER, core_minutes INTEGER, deep_minutes INTEGER, source TEXT NOT NULL DEFAULT \'apple_health\', received_at INTEGER NOT NULL)'),
    db.prepare('CREATE INDEX IF NOT EXISTS idx_sleep_records_end_at ON sleep_records (end_at DESC)'),
  ]);
}
