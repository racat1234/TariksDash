import { env } from 'cloudflare:workers';
import { eq, sql } from 'drizzle-orm';
import { syncState, tasks, weeklyActivities } from '@/db/schema';
import { database, ensureDatabase } from '@/lib/db';

type Photo = { file_id: string; width: number; height: number };
type Message = {
  text?: string;
  caption?: string;
  photo?: Photo[];
  chat: { id: number };
};
type Update = { update_id: number; message?: Message };
type AiActivity = {
  date?: string;
  day?: string;
  title: string;
  start: string;
  end?: string;
};
type AiTextItem = AiActivity & { kind: 'activity' | 'todo' };
type Pending = {
  title: string;
  startAt: string;
  endAt: string;
  estimatedEnd?: boolean;
};
class PhotoReadError extends Error {
  constructor(public kind: 'telegram' | 'key' | 'quota' | 'gemini' | 'format') {
    super(kind);
  }
}
const weekdays: Record<string, number> = {
  sunday: 0,
  sun: 0,
  monday: 1,
  mon: 1,
  tuesday: 2,
  tue: 2,
  tues: 2,
  wednesday: 3,
  wed: 3,
  thursday: 4,
  thu: 4,
  thurs: 4,
  friday: 5,
  fri: 5,
  saturday: 6,
  sat: 6,
};

function parseTime(value: string) {
  const match = value.trim().match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm)?$/i);
  if (!match) return null;
  let hour = Number(match[1]);
  const minute = Number(match[2] || 0);
  const meridiem = match[3]?.toLowerCase();
  if (minute > 59 || hour > (meridiem ? 12 : 23)) return null;
  if (meridiem === 'pm' && hour !== 12) hour += 12;
  if (meridiem === 'am' && hour === 12) hour = 0;
  return hour * 60 + minute;
}
function nextDateFor(day: number, minute: number) {
  const now = new Date();
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Detroit',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    weekday: 'short',
  }).formatToParts(now);
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((item) => item.type === type)?.value || '';
  const delta = (day - weekdays[part('weekday').toLowerCase()] + 7) % 7;
  const base = new Date(
    `${part('year')}-${part('month')}-${part('day')}T12:00:00-04:00`,
  );
  base.setDate(base.getDate() + delta);
  const date = `${base.getFullYear()}-${String(base.getMonth() + 1).padStart(2, '0')}-${String(base.getDate()).padStart(2, '0')}`;
  const noon = new Date(`${date}T12:00:00-04:00`);
  const offset =
    new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/Detroit',
      timeZoneName: 'longOffset',
    })
      .formatToParts(noon)
      .find((item) => item.type === 'timeZoneName')
      ?.value.replace('GMT', '') || '-04:00';
  return new Date(
    `${date}T${String(Math.floor(minute / 60)).padStart(2, '0')}:${String(minute % 60).padStart(2, '0')}:00${offset}`,
  );
}
function dateAt(date: string, minute: number) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;
  const noon = new Date(`${date}T12:00:00-04:00`);
  if (Number.isNaN(noon.getTime())) return null;
  const offset =
    new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/Detroit',
      timeZoneName: 'longOffset',
    })
      .formatToParts(noon)
      .find((item) => item.type === 'timeZoneName')
      ?.value.replace('GMT', '') || '-04:00';
  const value = new Date(
    `${date}T${String(Math.floor(minute / 60)).padStart(2, '0')}:${String(minute % 60).padStart(2, '0')}:00${offset}`,
  );
  return Number.isNaN(value.getTime()) ? null : value;
}
function normalize(item: AiActivity): Pending | null {
  const start = parseTime(item.start || '');
  if (start === null || !item.title?.trim()) return null;
  const parsedEnd = parseTime(item.end || '');
  const estimatedEnd = parsedEnd === null;
  const end = parsedEnd ?? start + (/game|match/i.test(item.title) ? 90 : 60);
  if (end <= start) return null;
  const day = weekdays[item.day?.trim().toLowerCase() || ''];
  const startDate = item.date
    ? dateAt(item.date, start)
    : day === undefined
      ? null
      : nextDateFor(day, start);
  const endDate = item.date
    ? dateAt(item.date, end)
    : day === undefined
      ? null
      : nextDateFor(day, end);
  if (!startDate || !endDate) return null;
  return {
    title: item.title.trim().slice(0, 200),
    startAt: startDate.toISOString(),
    endAt: endDate.toISOString(),
    estimatedEnd,
  };
}
function parseLine(line: string) {
  const parts = line
    .split('|')
    .map((part) => part.trim())
    .filter(Boolean);
  if (parts.length !== 3) return null;
  const range = parts[2].split(/\s*(?:-|–|to)\s*/i);
  return normalize({
    day: parts[0],
    title: parts[1],
    start: range[0] || '',
    end: range[1] || '',
  });
}
function naturalActivity(text: string): Pending | null {
  const range = text.match(
    /\b(?:from\s+)?(\d{1,2}(?::\d{2})?\s*(?:am|pm)?)\s*(?:-|–|to|until)\s*(\d{1,2}(?::\d{2})?\s*(?:am|pm)?)\b/i,
  ) || text.match(/\b(?:at|around)\s+(\d{1,2}(?::\d{2})?\s*(?:am|pm)?)\b/i);
  if (!range) return null;
  const lower = text.toLowerCase();
  let date: string | undefined;
  let day: string | undefined;
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Detroit',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date());
  const value = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value || '';
  const today = new Date(`${value('year')}-${value('month')}-${value('day')}T12:00:00-04:00`);
  if (/\b(today|tonight|this evening)\b/.test(lower)) date = `${value('year')}-${value('month')}-${value('day')}`;
  else if (/\btomorrow\b/.test(lower)) {
    today.setDate(today.getDate() + 1);
    date = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  } else {
    day = Object.keys(weekdays).find((name) => new RegExp(`\\b${name}\\b`, 'i').test(text));
  }
  if (!date && !day) return null;
  const title = text
    .replace(range[0], '')
    .replace(/\b(tonight|this evening)\b/gi, '')
    .replace(/\b(today|tomorrow|next\s+)?(sun(day)?|mon(day)?|tue(sday)?|wed(nesday)?|thu(rsday)?|fri(day)?|sat(urday)?)\b/gi, '')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/[,.]+$/, '');
  const evening = /\b(tonight|evening|dinner|after[ -]?school)\b/i.test(text);
  let startTime = range[1].trim();
  let endTime = range[2]?.trim() || '';
  if (!/(am|pm)$/i.test(startTime) && evening) startTime += ' PM';
  if (endTime && !/(am|pm)$/i.test(endTime) && evening) endTime += ' PM';
  return normalize({ title, date, day, start: startTime, end: endTime });
}
async function telegram(
  token: string,
  method: string,
  body: Record<string, unknown>,
) {
  return fetch(`https://api.telegram.org/bot${token}/${method}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}
async function reply(token: string, chatId: string, text: string) {
  await telegram(token, 'sendMessage', { chat_id: chatId, text });
}
async function getPhoto(token: string, photo: Photo) {
  const response = await telegram(token, 'getFile', { file_id: photo.file_id });
  const payload = (await response.json()) as {
    ok: boolean;
    result?: { file_path?: string };
  };
  if (!payload.ok || !payload.result?.file_path)
    throw new PhotoReadError('telegram');
  const image = await fetch(
    `https://api.telegram.org/file/bot${token}/${payload.result.file_path}`,
  );
  if (!image.ok) throw new PhotoReadError('telegram');
  const bytes = new Uint8Array(await image.arrayBuffer());
  if (
    bytes.length < 4 ||
    bytes[0] !== 0xff ||
    bytes[1] !== 0xd8 ||
    bytes[2] !== 0xff
  )
    throw new PhotoReadError('telegram');
  let binary = '';
  for (let i = 0; i < bytes.length; i += 0x4000)
    binary += String.fromCharCode(...bytes.subarray(i, i + 0x4000));
  return { data: btoa(binary), mimeType: 'image/jpeg' };
}
async function readImage(
  apiKey: string,
  image: { data: string; mimeType: string },
  caption = '',
) {
  const today = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Detroit',
    dateStyle: 'full',
  }).format(new Date());
  const prompt = `Read this schedule image for Tarik. Today is ${today}. Extract every upcoming after-school or personal activity with a clear date or weekday, name, and start time. Preserve each printed calendar date as YYYY-MM-DD. If only one time is printed, put it in start and leave end blank; do not reject the activity. Do not include school bell periods. ${caption ? `Context: ${caption}` : ''} Return JSON only: {"activities":[{"date":"2026-09-14","day":"Monday","title":"Football practice","start":"3:15 PM","end":"4:30 PM"}],"note":"short explanation if unclear"}. If nothing is reliable, return an empty activities array.`;
  let response: Response | null = null;
  for (let attempt = 0; attempt < 3; attempt++) {
    response = await fetch(
      'https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent',
      {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-goog-api-key': apiKey,
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  inline_data: { mime_type: image.mimeType, data: image.data },
                },
                { text: prompt },
              ],
            },
          ],
          generationConfig: {
            responseMimeType: 'application/json',
            temperature: 0.1,
          },
        }),
      },
    );
    if (response.ok) break;
    if (response.status !== 429 && response.status < 500) break;
    await new Promise((resolve) => setTimeout(resolve, 700 * (attempt + 1)));
  }
  if (!response?.ok) {
    if (response?.status === 401 || response?.status === 403)
      throw new PhotoReadError('key');
    if (response?.status === 429) throw new PhotoReadError('quota');
    throw new PhotoReadError('gemini');
  }
  const payload = (await response.json()) as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
  };
  try {
    return JSON.parse(
      payload.candidates?.[0]?.content?.parts
        ?.map((part) => part.text || '')
        .join('') || '{}',
    ) as { activities?: AiActivity[]; note?: string };
  } catch {
    throw new PhotoReadError('format');
  }
}
function confirmation(items: Pending[], note?: string) {
  const date = new Intl.DateTimeFormat('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
    timeZone: 'America/Detroit',
  });
  const time = new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    timeZone: 'America/Detroit',
  });
  return `I found:\n${items.map((item) => `• ${item.title} — ${date.format(new Date(item.startAt))}, ${time.format(new Date(item.startAt))}–${time.format(new Date(item.endAt))}${item.estimatedEnd ? ' (estimated end)' : ''}`).join('\n')}${note ? `\n\nNote: ${note}` : ''}\n\nReply YES to add these to your dashboard, or NO to cancel.`;
}
async function interpretText(text: string) {
  const today = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Detroit',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    weekday: 'long',
  }).format(new Date());
  const prompt = `You sort Tarik's natural Telegram messages for his personal dashboard. Today in America/Detroit is ${today}. Return each requested item as either "activity" or "todo". An activity is a scheduled after-school/personal event such as practice, tutoring, a game, appointment, meeting, or outing with a date and start time. Homework, chores, reminders, and things to finish are todos. Resolve relative dates such as today, tomorrow, Friday, or next Monday to YYYY-MM-DD. For activities, preserve the start and end times. If no end is stated, leave end blank. If a message sounds like an event but has no usable date or start time, classify it as a todo so it is not lost. Clean up spelling without changing meaning. Message: ${JSON.stringify(text)}. Return JSON only: {"items":[{"kind":"activity","title":"Football practice","date":"2026-09-14","start":"3:15 PM","end":"4:30 PM"},{"kind":"todo","title":"Finish chemistry worksheet","start":""}]}.`;
  const workersAi = (env as unknown as { AI?: { run: (model: string, input: unknown) => Promise<unknown> } }).AI;
  if (!workersAi) throw new Error('Workers AI binding is unavailable');
  const result = await workersAi.run('@cf/meta/llama-3.1-8b-instruct-fast', {
    messages: [
      { role: 'system', content: 'Return valid JSON only. Do not use markdown fences.' },
      { role: 'user', content: prompt },
    ],
    temperature: 0,
    max_tokens: 700,
  });
  const output = typeof result === 'string'
    ? result
    : (result as { response?: string }).response || '';
  const cleaned = output.replace(/^```(?:json)?\s*|```$/g, '').trim();
  const start = cleaned.indexOf('{');
  const end = cleaned.lastIndexOf('}');
  const parsed = JSON.parse(start >= 0 && end > start ? cleaned.slice(start, end + 1) : cleaned) as { items?: AiTextItem[] };
  if (!Array.isArray(parsed.items)) throw new Error('Workers AI returned invalid data');
  return parsed.items;
}

export async function POST() {
  const token = String(env.TELEGRAM_BOT_TOKEN || '');
  const chat = String(env.TELEGRAM_CHAT_ID || '');
  const key = String(env.GEMINI_API_KEY || '');
  const workersAiConfigured = Boolean((env as unknown as { AI?: unknown }).AI);
  if (!token || !chat)
    return Response.json({
      configured: false,
      aiConfigured: workersAiConfigured || Boolean(key),
      imported: 0,
      activitiesImported: 0,
    });
  await ensureDatabase();
  const lockTime = Date.now();
  const lock = await (env.DB as D1Database)
    .prepare(
      "INSERT INTO sync_state (key,value) VALUES ('telegram_sync_lock',?) ON CONFLICT(key) DO UPDATE SET value=excluded.value WHERE CAST(sync_state.value AS INTEGER) < ? RETURNING value",
    )
    .bind(String(lockTime), String(lockTime - 120_000))
    .first();
  if (!lock)
    return Response.json({
      configured: true,
      aiConfigured: workersAiConfigured || Boolean(key),
      busy: true,
      imported: 0,
      activitiesImported: 0,
    });
  const db = database();
  const [offsetRows, pendingRows] = await Promise.all([
    db.select().from(syncState).where(eq(syncState.key, 'telegram_offset')),
    db
      .select()
      .from(syncState)
      .where(eq(syncState.key, 'telegram_pending_activities')),
  ]);
  const offset = Number(offsetRows[0]?.value || 0);
  let pending: Pending[] = [];
  try {
    pending = JSON.parse(pendingRows[0]?.value || '[]');
  } catch {
    pending = [];
  }
  const url = new URL(`https://api.telegram.org/bot${token}/getUpdates`);
  url.searchParams.set('offset', String(offset));
  url.searchParams.set('limit', '100');
  url.searchParams.set('timeout', '0');
  url.searchParams.set('allowed_updates', JSON.stringify(['message']));
  const response = await fetch(url);
  if (!response.ok)
    return Response.json(
      { configured: true, error: 'Telegram could not be reached.' },
      { status: 502 },
    );
  const payload = (await response.json()) as { ok: boolean; result: Update[] };
  if (!payload.ok)
    return Response.json(
      { configured: true, error: 'Telegram rejected the sync.' },
      { status: 502 },
    );
  const updates = payload.result.filter(
    (update) => String(update.message?.chat.id || '') === chat,
  );
  const taskValues: Array<{
    title: string;
    source: string;
    externalId: string;
  }> = [];
  const activityValues: Array<{
    title: string;
    startAt: Date;
    endAt: Date;
    source: string;
    externalId: string;
  }> = [];
  for (const update of updates) {
    const message = update.message!;
    const text = message.text?.trim() || '';
    if (message.photo?.length) {
      await reply(
        token,
        chat,
        'Photo imports are turned off. Just text me naturally, like “Football practice Friday from 3:15 to 4:30” or “Finish my chemistry worksheet.”',
      );
      continue;
    }
    if (!text || text.startsWith('/')) continue;
    const clearActivity = naturalActivity(text);
    if (clearActivity) {
      activityValues.push({
        title: clearActivity.title,
        startAt: new Date(clearActivity.startAt),
        endAt: new Date(clearActivity.endAt),
        source: 'telegram-parser',
        externalId: `telegram-parser:${update.update_id}`,
      });
      await reply(token, chat, 'Added 1 after-school activity ✅');
      continue;
    }
    try {
      const items = await interpretText(text);
      let addedTasks = 0;
      let addedActivities = 0;
      items.forEach((item, index) => {
        if (item.kind === 'activity') {
          const activity = normalize(item);
          if (activity) {
            activityValues.push({
              title: activity.title,
              startAt: new Date(activity.startAt),
              endAt: new Date(activity.endAt),
              source: 'telegram-ai',
              externalId: `telegram-ai:${update.update_id}:${index}`,
            });
            addedActivities++;
            return;
          }
        }
        const title = item.title?.trim();
        if (title) {
          taskValues.push({
            title: title.slice(0, 500),
            source: 'telegram-ai',
            externalId: `telegram-ai:${update.update_id}:${index}`,
          });
          addedTasks++;
        }
      });
      if (!addedTasks && !addedActivities) {
        taskValues.push({
          title: text.slice(0, 500),
          source: 'telegram',
          externalId: `telegram:${update.update_id}`,
        });
        addedTasks = 1;
      }
      const parts = [];
      if (addedActivities)
        parts.push(
          `${addedActivities} after-school ${addedActivities === 1 ? 'activity' : 'activities'}`,
        );
      if (addedTasks)
        parts.push(`${addedTasks} to-do${addedTasks === 1 ? '' : 's'}`);
      await reply(token, chat, `Added ${parts.join(' and ')} ✅`);
    } catch {
      const activity = naturalActivity(text);
      if (activity) {
        activityValues.push({
          title: activity.title,
          startAt: new Date(activity.startAt),
          endAt: new Date(activity.endAt),
          source: 'telegram-parser',
          externalId: `telegram-parser:${update.update_id}`,
        });
        await reply(token, chat, 'Added 1 after-school activity ✅');
        continue;
      }
      taskValues.push({
        title: text.slice(0, 500),
        source: 'telegram-fallback',
        externalId: `telegram-fallback:${update.update_id}`,
      });
      await reply(token, chat, 'Added to your to-do list ✅');
    }
  }
  if (taskValues.length)
    await db.insert(tasks).values(taskValues).onConflictDoNothing();
  if (activityValues.length)
    await db
      .insert(weeklyActivities)
      .values(activityValues)
      .onConflictDoNothing();
  const nextOffset = payload.result.length
    ? Math.max(...payload.result.map((update) => update.update_id)) + 1
    : offset;
  await db.batch([
    db
      .insert(syncState)
      .values({ key: 'telegram_offset', value: String(nextOffset) })
      .onConflictDoUpdate({
        target: syncState.key,
        set: { value: sql`excluded.value` },
      }),
    db
      .insert(syncState)
      .values({
        key: 'telegram_pending_activities',
        value: JSON.stringify(pending),
      })
      .onConflictDoUpdate({
        target: syncState.key,
        set: { value: sql`excluded.value` },
      }),
  ]);
  await db
    .insert(syncState)
    .values({ key: 'telegram_sync_lock', value: '0' })
    .onConflictDoUpdate({ target: syncState.key, set: { value: '0' } });
  return Response.json({
    configured: true,
    aiConfigured: workersAiConfigured || Boolean(key),
    imported: taskValues.length,
    activitiesImported: activityValues.length,
    awaitingConfirmation: pending.length > 0,
  });
}
