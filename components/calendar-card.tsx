'use client';

import { ArrowUpRight, CalendarDays, Clock3, Loader2, MapPin, RefreshCw } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';

type CalendarEvent = { id: string; title: string; location: string | null; start: string; end: string; allDay: boolean };

const calendarUrl = 'https://calendar.google.com/calendar/embed?src=c546e6cf6a746ada251ab2740720bf6eb3723d001bc04c04e062f58c8ff7d0f0%40group.calendar.google.com&ctz=America%2FDetroit';
const dateFormatter = new Intl.DateTimeFormat('en-US', { weekday: 'short', month: 'short', day: 'numeric', timeZone: 'America/Detroit' });
const timeFormatter = new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit', timeZone: 'America/Detroit' });

export function CalendarCard() {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(false);
  const load = useCallback(async () => {
    setRefreshing(true);
    try { const response = await fetch('/api/calendar'); if (!response.ok) throw new Error(); const data = await response.json(); setEvents(data.events); setError(false); } catch { setError(true); }
    setLoading(false); setRefreshing(false);
  }, []);
  useEffect(() => { void load(); const timer = window.setInterval(load, 15 * 60_000); return () => window.clearInterval(timer); }, [load]);

  return (
    <section className="dashboard-card overflow-hidden">
      <div className="flex items-center justify-between border-b border-border/70 px-5 py-4 sm:px-6">
        <div className="flex items-center gap-3"><div className="grid size-9 place-items-center rounded-xl bg-violet-400/10 text-violet-300"><CalendarDays className="size-4" /></div><div><p className="eyebrow">Skylight calendar</p><h2 className="mt-0.5 font-semibold tracking-tight">Upcoming</h2></div></div>
        <div className="flex items-center gap-1"><button onClick={load} className="rounded-lg p-2 text-muted-foreground transition hover:bg-secondary hover:text-foreground" aria-label="Refresh calendar"><RefreshCw className={`size-4 ${refreshing ? 'animate-spin' : ''}`} /></button><a href={calendarUrl} target="_blank" rel="noreferrer" className="rounded-lg p-2 text-muted-foreground transition hover:bg-secondary hover:text-foreground" aria-label="Open Google Calendar"><ArrowUpRight className="size-4" /></a></div>
      </div>
      {loading ? <div className="flex items-center justify-center gap-2 px-6 py-12 text-sm text-muted-foreground"><Loader2 className="size-4 animate-spin" /> Loading your calendar</div> : error ? <div className="px-6 py-10 text-center"><p className="font-medium">Calendar is taking a moment.</p><button onClick={load} className="mt-2 text-sm text-violet-300">Try again</button></div> : events.length === 0 ? <div className="px-6 py-10 text-center"><CalendarDays className="mx-auto size-7 text-muted-foreground/50" /><p className="mt-3 font-medium">Nothing coming up yet.</p><p className="mt-1 text-sm text-muted-foreground">New Skylight calendar events will appear here automatically.</p></div> : <div className="divide-y divide-border/70">{events.slice(0, 6).map((event) => { const start = new Date(event.start); return <article key={event.id} className="grid grid-cols-[68px_minmax(0,1fr)] gap-4 px-5 py-4 transition hover:bg-secondary/25 sm:px-6"><div className="rounded-xl border border-border bg-background px-2 py-2 text-center"><div className="text-[10px] font-bold uppercase tracking-wider text-violet-300">{new Intl.DateTimeFormat('en-US', { month: 'short', timeZone: 'America/Detroit' }).format(start)}</div><div className="mt-0.5 text-xl font-semibold">{new Intl.DateTimeFormat('en-US', { day: 'numeric', timeZone: 'America/Detroit' }).format(start)}</div></div><div className="min-w-0 self-center"><h3 className="truncate text-sm font-semibold">{event.title}</h3><div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground"><span className="flex items-center gap-1.5"><Clock3 className="size-3" />{event.allDay ? 'All day' : `${dateFormatter.format(start)} · ${timeFormatter.format(start)}`}</span>{event.location && <span className="flex min-w-0 items-center gap-1.5"><MapPin className="size-3 shrink-0" /><span className="truncate">{event.location}</span></span>}</div></div></article>; })}</div>}
    </section>
  );
}
