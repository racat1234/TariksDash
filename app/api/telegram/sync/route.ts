import { env } from 'cloudflare:workers';
import { eq, sql } from 'drizzle-orm';
import { syncState, tasks } from '@/db/schema';
import { database, ensureDatabase } from '@/lib/db';

type TelegramUpdate = { update_id: number; message?: { message_id: number; text?: string; chat: { id: number } } };

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
  if (accepted.length) {
    await db.insert(tasks).values(accepted.map((update) => ({ title: update.message!.text!.trim().slice(0, 500), source: 'telegram', externalId: `telegram:${update.update_id}` }))).onConflictDoNothing();
  }
  const nextOffset = payload.result.length ? Math.max(...payload.result.map((update) => update.update_id)) + 1 : offset;
  await db.insert(syncState).values({ key: 'telegram_offset', value: String(nextOffset) }).onConflictDoUpdate({ target: syncState.key, set: { value: sql`excluded.value` } });
  return Response.json({ configured: true, imported: accepted.length });
}
