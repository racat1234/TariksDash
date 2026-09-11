import { desc, eq } from 'drizzle-orm';
import { tasks } from '@/db/schema';
import { database, ensureDatabase } from '@/lib/db';

export async function GET() {
  await ensureDatabase();
  const rows = await database().select().from(tasks).orderBy(desc(tasks.createdAt));
  return Response.json({ tasks: rows });
}

export async function POST(request: Request) {
  await ensureDatabase();
  const body = await request.json() as { title?: string };
  const title = body.title?.trim().slice(0, 500);
  if (!title) return Response.json({ error: 'A task title is required.' }, { status: 400 });
  const [task] = await database().insert(tasks).values({ title, source: 'web' }).returning();
  return Response.json({ task }, { status: 201 });
}

export async function PATCH(request: Request) {
  await ensureDatabase();
  const body = await request.json() as { id?: number; completed?: boolean };
  if (!Number.isInteger(body.id) || typeof body.completed !== 'boolean') return Response.json({ error: 'Invalid task update.' }, { status: 400 });
  const [task] = await database().update(tasks).set({ completed: body.completed }).where(eq(tasks.id, body.id!)).returning();
  return task ? Response.json({ task }) : Response.json({ error: 'Task not found.' }, { status: 404 });
}

export async function DELETE(request: Request) {
  await ensureDatabase();
  const id = Number(new URL(request.url).searchParams.get('id'));
  if (!Number.isInteger(id)) return Response.json({ error: 'Invalid task id.' }, { status: 400 });
  await database().delete(tasks).where(eq(tasks.id, id));
  return new Response(null, { status: 204 });
}
