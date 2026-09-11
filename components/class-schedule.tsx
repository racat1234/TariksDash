'use client';

import { BookOpenCheck, Clock3 } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { fireConfetti } from '@/lib/confetti';

type Period = { hour: number; name: string; start: string; end: string };
type ScheduleMode = 'auto' | 'regular' | 'wednesday';
type Status = { isWednesday: boolean; kind: 'before' | 'active' | 'transition' | 'wellness' | 'after'; title: string; detail: string; sub: string; progress: number; tone: 'normal' | 'orange' | 'red'; confettiKey?: string };

const classes = ['Study Hall', 'Global Studies', 'Chemistry', 'Essentials', 'Lunch', 'Yearbook', 'Government', 'Pre-Calculus'];
const regularTimes = [['8:40','9:23'],['9:26','10:09'],['10:25','11:08'],['11:11','11:54'],['11:57','12:40'],['12:43','13:26'],['13:29','14:12'],['14:15','14:58']];
const wednesdayTimes = [['8:35','9:09'],['9:12','9:46'],['10:02','10:34'],['10:37','11:09'],['11:12','12:00'],['12:03','12:35'],['12:38','13:10'],['13:13','13:45']];

function minutes(value: string) { const [hour, minute] = value.split(':').map(Number); return hour * 60 + minute; }
function timeLabel(value: string) { const total = minutes(value); const hour = Math.floor(total / 60); const minute = total % 60; return `${hour % 12 || 12}:${String(minute).padStart(2, '0')} ${hour >= 12 ? 'PM' : 'AM'}`; }
function remainingLabel(totalSeconds: number) { const safe = Math.max(0, totalSeconds); const mins = Math.floor(safe / 60); const seconds = safe % 60; return mins > 0 ? `${mins}m ${seconds}s left` : `${seconds}s left`; }
function suffix(hour: number) { return hour === 1 ? 'st' : hour === 2 ? 'nd' : hour === 3 ? 'rd' : 'th'; }

function detroitParts(date: Date) {
  const parts = new Intl.DateTimeFormat('en-US', { timeZone: 'America/Detroit', year: 'numeric', month: '2-digit', day: '2-digit', weekday: 'short', hour: 'numeric', minute: 'numeric', second: 'numeric', hourCycle: 'h23' }).formatToParts(date);
  const get = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value || '';
  return { weekday: get('weekday'), dateKey: `${get('year')}-${get('month')}-${get('day')}`, seconds: Number(get('hour')) * 3600 + Number(get('minute')) * 60 + Number(get('second')) };
}

export function ClassSchedule() {
  const [now, setNow] = useState<Date | null>(null);
  const [scheduleMode, setScheduleMode] = useState<ScheduleMode>('auto');
  const celebrated = useRef('');
  useEffect(() => { const updateMode = (event: Event) => setScheduleMode((event as CustomEvent<ScheduleMode>).detail || 'auto'); setScheduleMode((window.localStorage.getItem('dashboard-schedule-mode') as ScheduleMode) || 'auto'); window.addEventListener('dashboard-schedule-mode', updateMode); setNow(new Date()); const timer = window.setInterval(() => setNow(new Date()), 1000); return () => { window.clearInterval(timer); window.removeEventListener('dashboard-schedule-mode', updateMode); }; }, []);

  const status = useMemo<Status | null>(() => {
    if (!now) return null;
    const { weekday, dateKey, seconds } = detroitParts(now);
    if (weekday === 'Sat' || weekday === 'Sun') return null;
    const isWednesday = scheduleMode === 'wednesday' || (scheduleMode === 'auto' && weekday === 'Wed');
    const periods: Period[] = (isWednesday ? wednesdayTimes : regularTimes).map(([start, end], index) => ({ hour: index + 1, name: classes[index], start, end }));
    const currentMinutes = seconds / 60; const first = periods[0]; const last = periods[periods.length - 1];
    if (currentMinutes < minutes(first.start)) return { isWednesday, kind: 'before', title: 'School starts soon', detail: `First hour · ${first.name}`, sub: `Starts at ${timeLabel(first.start)}`, progress: 0, tone: 'normal' };
    if (currentMinutes >= minutes(last.end)) return { isWednesday, kind: 'after', title: 'School is over', detail: 'You made it through the day.', sub: isWednesday ? 'Wednesday early dismissal' : `Dismissed after eighth hour at ${timeLabel(last.end)}`, progress: 100, tone: 'normal' };
    const current = periods.find((period) => currentMinutes >= minutes(period.start) && currentMinutes < minutes(period.end));
    if (current) {
      const startSeconds = minutes(current.start) * 60; const endSeconds = minutes(current.end) * 60; const secondsLeft = Math.ceil(endSeconds - seconds); const next = periods[current.hour];
      return { isWednesday, kind: 'active', title: current.name, detail: `${current.hour}${suffix(current.hour)} hour · ${timeLabel(current.start)}–${timeLabel(current.end)}`, sub: `${remainingLabel(secondsLeft)}${next ? ` · Next: ${next.name}` : ''}`, progress: Math.min(100, Math.max(0, ((seconds - startSeconds) / (endSeconds - startSeconds)) * 100)), tone: secondsLeft <= 180 ? 'red' : secondsLeft <= 300 ? 'orange' : 'normal', confettiKey: secondsLeft <= 1 ? `${dateKey}-${current.hour}-${current.end}` : undefined };
    }
    const next = periods.find((period) => currentMinutes < minutes(period.start))!; const previous = periods[next.hour - 2];
    const wellness = previous?.hour === 2 && ((isWednesday && currentMinutes < 10 * 60 + 2) || (!isWednesday && currentMinutes < 10 * 60 + 25));
    return { isWednesday, kind: wellness ? 'wellness' : 'transition', title: wellness ? 'Wellness break' : 'Transition time', detail: `Next: ${next.name} at ${timeLabel(next.start)}`, sub: `${remainingLabel(Math.ceil(minutes(next.start) * 60 - seconds))} until ${next.hour}${suffix(next.hour)} hour`, progress: 0, tone: 'normal' };
  }, [now, scheduleMode]);

  useEffect(() => { if (status?.confettiKey && celebrated.current !== status.confettiKey) { celebrated.current = status.confettiKey; fireConfetti(); } }, [status?.confettiKey]);
  if (!status) return null;
  const warningClass = status.tone === 'red' ? 'schedule-warning-red' : status.tone === 'orange' ? 'schedule-warning-orange' : '';
  const progressClass = status.tone === 'red' ? 'bg-red-500' : status.tone === 'orange' ? 'bg-orange-400' : status.isWednesday ? 'bg-sky-400' : 'bg-primary';
  return <section data-dashboard-section="schedule" className={`dashboard-card overflow-hidden ${warningClass}`}>
    <div className="flex items-center justify-between border-b border-border/70 px-5 py-4 sm:px-6"><div className="flex items-center gap-3"><div className={`grid size-9 place-items-center rounded-xl ${status.isWednesday ? 'bg-sky-400/12 text-sky-300' : 'bg-primary/10 text-primary'}`}><BookOpenCheck className="size-4" /></div><div><p className="eyebrow">{status.kind === 'transition' ? 'Between classes' : 'Current class'}</p><h2 className="mt-0.5 font-semibold tracking-tight">School day</h2></div></div><span className={`rounded-full px-2.5 py-1 text-[10px] font-semibold ${status.isWednesday ? 'bg-sky-400/10 text-sky-300' : 'bg-secondary text-muted-foreground'}`}>{status.isWednesday ? 'Wednesday schedule' : 'Regular schedule'}</span></div>
    <div className="p-5 sm:p-6"><div className="flex items-start justify-between gap-5"><div><p className="text-2xl font-semibold tracking-tight">{status.title}</p><p className="mt-1 text-sm text-muted-foreground">{status.detail}</p></div><Clock3 className="mt-1 size-5 shrink-0 text-muted-foreground" /></div><div className="mt-5 h-2 overflow-hidden rounded-full bg-secondary"><div className={`h-full rounded-full transition-[width,background-color] duration-500 ${progressClass}`} style={{ width: `${status.progress}%` }} /></div><p className={`mt-2 text-xs font-medium ${status.tone === 'red' ? 'text-red-400' : status.tone === 'orange' ? 'text-orange-400' : 'text-muted-foreground'}`}>{status.sub}</p></div>
  </section>;
}
