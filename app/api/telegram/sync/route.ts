import { env } from 'cloudflare:workers';
import { eq, sql } from 'drizzle-orm';
import { syncState, tasks, weeklyActivities } from '@/db/schema';
import { database, ensureDatabase } from '@/lib/db';

type TelegramUpdate = { update_id: number; message?: { message_id: number; text?: string; chat: { id: number } } };

const weekdays: Record<string, number> = { sunday: 0, sun: 0, monday: 1, mon: 1, tuesday: 2, tue: 2, tues: 2, wednesday: 3, wed: 3, thursday: 4, thu: 4, thurs: 4, friday: 5, fri: 5, saturday: 6, sat: 6 };
function parseTime(value: string) { const match = value.trim().match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm)?$/i); if (!match) return null; let hour = Number(match[1]); const minute = Number(match[2] || 0); const meridiem = match[3]?.toLowerCase(); if (minute > 59 || hour > (meridiem ? 12 : 23)) return null; if (meridiem === 'pm' && hour !== 12) hour += 12; if (meridiem === 'am' && hour === 12) hour = 0; return hour * 60 + minute; }
function nextDateFor(day: number, minute: number) { const now = new Date(); const parts = new Intl.DateTimeFormat('en-US', { timeZone: 'America/Detroit', year: 'numeric', month: '2-digit', day: '2-digit', weekday: 'short' }).formatToParts(now); const part = (type: Intl.DateTimeFormatPartTypes) => parts.find((item) => item.type === type)?.value || ''; const currentDay = weekdays[part('weekday').toLowerCase()]; const delta = (day - currentDay + 7) % 7; const base = new Date(`${part('year')}-${part('month')}-${part('day')}T12:00:00-04:00`); base.setDate(base.getDate() + delta); const date = `${base.getFullYear()}-${String(base.getMonth() + 1).padStart(2, '0')}-${String(base.getDate()).padStart(2, '0')}`; const noon = new Date(`${date}T12:00:00-04:00`); const offset = new Intl.DateTimeFormat('en-US', { timeZone: 'America/Detroit', timeZoneName: 'longOffset' }).formatToParts(noon).find((item) => item.type === 'timeZoneName')?.value.replace('GMT', '') || '-04:00'; return new Date(`${date}T${String(Math.floor(minute / 60)).padStart(2, '0')}:${String(minute % 60).padStart(2, '0')}:00${offset}`); }
function parseActivityLine(line: string) { const parts = line.split('|').map((part) => part.trim()).filter(Boolean); if (parts.length !== 3) return null; const day = weekdays[parts[0].toLowerCase()]; const range = parts[2].split(/\s*(?:-|–|to)\s*/i); const startMinute = parseTime(range[0] || ''); const endMinute = parseTime(range[1] || ''); if (day === undefined || startMinute === null || endMinute === null || endMinute <= startMinute || !parts[1]) return null; return { title: parts[1].slice(0, 200), startAt: nextDateFor(day, startMinute), endAt: nextDateFor(day, endMinute) }; }

export async function POST() {
  const token = String(env.TELEGRAM_BOT_TOKEN || '');
  const allowedChat = String(env.TELEGRAM_CHAT_ID || '');
  if (!token || !allowedChat) return Response.json({ configured: false, imported: 0 });

  await ensureDatabase();
  const db = database();
  const [state] = await db.select().from(syncState).where(eq(syncState.key, 'telegram_offset'));
  const offset = Number(state?.value || 0);
  const endpoint = new URL(`https://api.telegram.org/bot${token}/getUpdates`);
  endpoint.searchParams.set('offset', String(offset));
  endpoint.searchParams.set('limit', '100');
  endpoint.searchParams.set('timeout', '0');
  endpoint.searchParams.set('allowed_updates', JSON.stringify(['message']));

  const response = await fetch(endpoint);
  if (!response.ok) return Response.json({ configured: true, error: 'Telegram could not be reached.' }, { status: 502 });
  const payload = await response.json() as { ok: boolean; result: TelegramUpdate[] };
  if (!payload.ok) return Response.json({ configured: true, error: 'Telegram rejected the sync.' }, { status: 502 });

  const accepted = payload.result.filter((update) => {
    const text = update.message?.text?.trim();
    return String(update.message?.chat.id || '') === allowedChat && text && !text.startsWith('/');
  });
  const taskValues: Array<{ title: string; source: string; externalId: string }> = [];
  const activityValues: Array<{ title: string; startAt: Date; endAt: Date; source: string; externalId: string }> = [];
  for (const update of accepted) {
    const text = update.message!.text!.trim();
    if (/^schedule\s*:/i.test(text)) {
      text.replace(/^schedule\s*:/i, '').split(/\n+/).map((line) => line.trim()).filter(Boolean).forEach((line, index) => { const activity = parseActivityLine(line); if (activity) activityValues.push({ ...activity, source: 'telegram', externalId: `telegram:${update.update_id}:${index}` }); });
    } else taskValues.push({ title: text.slice(0, 500), source: 'telegram', externalId: `telegram:${update.update_id}` });
  }
  if (taskValues.length) await db.insert(tasks).values(taskValues).onConflictDoNothing();
  if (activityValues.length) await db.insert(weeklyActivities).values(activityValues).onConflictDoNothing();
  const nextOffset = payload.result.length ? Math.max(...payload.result.map((update) => update.update_id)) + 1 : offset;
  await db.insert(syncState).values({ key: 'telegram_offset', value: String(nextOffset) }).onConflictDoUpdate({ target: syncState.key, set: { value: sql`excluded.value` } });
  return Response.json({ configured: true, imported: taskValues.length, activitiesImported: activityValues.length });
}
