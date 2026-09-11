import { desc } from 'drizzle-orm';
import { sleepRecords } from '@/db/schema';
import { database, ensureDatabase } from '@/lib/db';

export async function GET() {
  await ensureDatabase();
  const records = await database().select().from(sleepRecords).orderBy(desc(sleepRecords.endAt)).limit(2);
  return Response.json({ sleep: records[0] || null, previousSleep: records[1] || null });
}

export async function POST(request: Request) {
  const body = await request.json() as Record<string, unknown>;
  const totalMinutes = Math.round(Number(body.totalMinutes));
  const endAt = body.endAt ? new Date(String(body.endAt)) : new Date();
  const startAt = body.startAt ? new Date(String(body.startAt)) : new Date(endAt.getTime() - totalMinutes * 60000);
  if (!Number.isFinite(startAt.getTime()) || !Number.isFinite(endAt.getTime()) || !Number.isInteger(totalMinutes) || totalMinutes < 0 || totalMinutes > 1440) return Response.json({ error: 'Invalid sleep summary.' }, { status: 400 });
  const sleepDate = String(body.sleepDate || new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Detroit' }).format(endAt));
  const optionalMinutes = (value: unknown) => Number.isFinite(Number(value)) ? Math.max(0, Math.round(Number(value))) : null;
  const record = { sleepDate, startAt, endAt, totalMinutes, awakeMinutes: optionalMinutes(body.awakeMinutes), remMinutes: optionalMinutes(body.remMinutes), coreMinutes: optionalMinutes(body.coreMinutes), deepMinutes: optionalMinutes(body.deepMinutes), source: 'apple_health' };
  await ensureDatabase();
  await database().insert(sleepRecords).values(record).onConflictDoUpdate({ target: sleepRecords.sleepDate, set: { ...record, receivedAt: new Date() } });
  return Response.json({ ok: true });
}
