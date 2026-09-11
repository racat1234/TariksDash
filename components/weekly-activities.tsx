'use client';

import { CalendarClock, Clock3, Loader2, MessageCircle, Trash2 } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';

type Activity = { id: number; title: string; startAt: string; endAt: string; completed: boolean };
const dayFormat = new Intl.DateTimeFormat('en-US', { weekday: 'long', month: 'short', day: 'numeric', timeZone: 'America/Detroit' });
const timeFormat = new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit', timeZone: 'America/Detroit' });

function durationLabel(milliseconds: number) {
  const totalMinutes = Math.max(0, Math.ceil(milliseconds / 60_000));
  const days = Math.floor(totalMinutes / 1440);
  const hours = Math.floor((totalMinutes % 1440) / 60);
  const minutes = totalMinutes % 60;
  if (days) return `${days}d ${hours}h`;
  if (hours) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

function timing(activity: Activity, now: number) {
  const start = new Date(activity.startAt).getTime();
  const end = new Date(activity.endAt).getTime();
  if (now < start) return { label: `Starts in ${durationLabel(start - now)}`, live: false };
  if (now < end) return { label: `Ends in ${durationLabel(end - now)}`, live: true };
  return { label: 'Finished', live: false };
}

export function WeeklyActivities() {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [now, setNow] = useState(() => Date.now());
  const load = useCallback(async () => {
    const from = new Date();
    from.setHours(0, 0, 0, 0);
    const to = new Date(from);
    to.setDate(to.getDate() + 8);
    const response = await fetch(`/api/activities?from=${encodeURIComponent(from.toISOString())}&to=${encodeURIComponent(to.toISOString())}`);
    if (response.ok) setActivities((await response.json()).activities);
    setLoading(false);
  }, []);
  useEffect(() => {
    void load();
    const refresh = window.setInterval(load, 8_000);
    const clock = window.setInterval(() => setNow(Date.now()), 1_000);
    window.addEventListener('focus', load);
    return () => {
      window.clearInterval(refresh);
      window.clearInterval(clock);
      window.removeEventListener('focus', load);
    };
  }, [load]);
  const groups = useMemo(() => Object.entries(activities.reduce<Record<string, Activity[]>>((result, activity) => {
    const key = dayFormat.format(new Date(activity.startAt));
    (result[key] ||= []).push(activity);
    return result;
  }, {})), [activities]);
  async function remove(id: number) {
    setActivities((items) => items.filter((item) => item.id !== id));
    const response = await fetch(`/api/activities?id=${id}`, { method: 'DELETE' });
    if (!response.ok) void load();
  }
  return <section data-dashboard-section="activities" className="dashboard-card overflow-hidden">
    <div className="flex items-center justify-between border-b border-border/70 px-5 py-4 sm:px-6">
      <div className="flex items-center gap-3"><div className="grid size-9 place-items-center rounded-xl bg-cyan-400/10 text-cyan-300"><CalendarClock className="size-4" /></div><div><p className="eyebrow">After school & more</p><h2 className="mt-0.5 font-semibold tracking-tight">This week</h2></div></div>
      <span className="flex items-center gap-1.5 text-[10px] text-muted-foreground"><MessageCircle className="size-3" /> Telegram</span>
    </div>
    {loading ? <div className="flex items-center justify-center gap-2 px-5 py-10 text-sm text-muted-foreground"><Loader2 className="size-4 animate-spin" /> Loading your week</div> : groups.length === 0 ? <div className="px-5 py-9 text-center"><p className="font-medium">Your week is clear.</p><p className="mt-1 text-xs text-muted-foreground">Text an event and its time to your Telegram bot.</p></div> : <div className="divide-y divide-border/70">{groups.map(([day, items]) => <div key={day} className="px-5 py-4 sm:px-6">
      <p className="mb-2 text-[10px] font-bold uppercase tracking-[.14em] text-cyan-300">{day}</p>
      {items.map((activity) => { const status = timing(activity, now); return <div key={activity.id} className={`group flex items-center gap-3 rounded-xl px-2 py-2.5 ${status.live ? 'bg-cyan-400/10 ring-1 ring-cyan-300/20' : ''}`}>
        <div className={`grid size-9 shrink-0 place-items-center rounded-xl ${status.live ? 'bg-cyan-300 text-slate-950' : 'bg-secondary text-cyan-300'}`}><Clock3 className="size-4" /></div>
        <div className="min-w-0 flex-1"><span className="block text-sm font-medium">{activity.title}</span><span className="mt-0.5 block text-xs text-muted-foreground">{timeFormat.format(new Date(activity.startAt))}–{timeFormat.format(new Date(activity.endAt))}</span></div>
        <span className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-semibold ${status.live ? 'bg-cyan-300 text-slate-950' : 'bg-secondary text-muted-foreground'}`}>{status.label}</span>
        <button onClick={() => remove(activity.id)} className="rounded-lg p-2 text-muted-foreground opacity-60 transition hover:bg-secondary hover:text-foreground sm:opacity-0 sm:group-hover:opacity-100" aria-label={`Delete ${activity.title}`}><Trash2 className="size-4" /></button>
      </div>; })}
    </div>)}</div>}
  </section>;
}
