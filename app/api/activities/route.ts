import { and, asc, eq, gte, lte } from 'drizzle-orm';
import { weeklyActivities } from '@/db/schema';
import { database, ensureDatabase } from '@/lib/db';

export async function GET(request: Request) {
  await ensureDatabase();
  const url = new URL(request.url);
  const now = new Date();
  const from = new Date(url.searchParams.get('from') || now.getTime());
  const to = new Date(url.searchParams.get('to') || now.getTime() + 8 * 86_400_000);
  const activities = await database().select().from(weeklyActivities).where(and(gte(weeklyActivities.startAt, from), lte(weeklyActivities.startAt, to))).orderBy(asc(weeklyActivities.startAt));
  return Response.json({ activities });
}

export async function PATCH(request: Request) {
  await ensureDatabase();
  const body = await request.json() as { id?: number; completed?: boolean };
  if (!Number.isInteger(body.id) || typeof body.completed !== 'boolean') return Response.json({ error: 'Invalid activity update.' }, { status: 400 });
  const [activity] = await database().update(weeklyActivities).set({ completed: body.completed }).where(eq(weeklyActivities.id, body.id!)).returning();
  return activity ? Response.json({ activity }) : Response.json({ error: 'Activity not found.' }, { status: 404 });
}

export async function DELETE(request: Request) {
  await ensureDatabase();
  const id = Number(new URL(request.url).searchParams.get('id'));
  if (!Number.isInteger(id)) return Response.json({ error: 'Invalid activity id.' }, { status: 400 });
  await database().delete(weeklyActivities).where(eq(weeklyActivities.id, id));
  return new Response(null, { status: 204 });
}
