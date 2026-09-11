import { index, integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';

export const tasks = sqliteTable('tasks', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  title: text('title').notNull(),
  completed: integer('completed', { mode: 'boolean' }).notNull().default(false),
  source: text('source').notNull().default('web'),
  externalId: text('external_id').unique(),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
}, (table) => [index('idx_tasks_completed_created_at').on(table.completed, table.createdAt)]);

export const syncState = sqliteTable('sync_state', {
  key: text('key').primaryKey(),
  value: text('value').notNull(),
});

export const sleepRecords = sqliteTable('sleep_records', {
  sleepDate: text('sleep_date').primaryKey(),
  startAt: integer('start_at', { mode: 'timestamp' }).notNull(),
  endAt: integer('end_at', { mode: 'timestamp' }).notNull(),
  totalMinutes: integer('total_minutes').notNull(),
  awakeMinutes: integer('awake_minutes'),
  remMinutes: integer('rem_minutes'),
  coreMinutes: integer('core_minutes'),
  deepMinutes: integer('deep_minutes'),
  source: text('source').notNull().default('apple_health'),
  receivedAt: integer('received_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
}, (table) => [index('idx_sleep_records_end_at').on(table.endAt)]);

export const weeklyActivities = sqliteTable('weekly_activities', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  title: text('title').notNull(),
  startAt: integer('start_at', { mode: 'timestamp' }).notNull(),
  endAt: integer('end_at', { mode: 'timestamp' }).notNull(),
  completed: integer('completed', { mode: 'boolean' }).notNull().default(false),
  source: text('source').notNull().default('telegram'),
  externalId: text('external_id').unique(),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
}, (table) => [index('idx_weekly_activities_start_at').on(table.startAt)]);
