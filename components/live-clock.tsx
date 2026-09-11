'use client';

import { Clock3 } from 'lucide-react';
import { useEffect, useState } from 'react';

const time = new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit', second: '2-digit', timeZone: 'America/Detroit' });
const date = new Intl.DateTimeFormat('en-US', { weekday: 'long', month: 'long', day: 'numeric', timeZone: 'America/Detroit' });

export function LiveClock() {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => { setNow(new Date()); const timer = window.setInterval(() => setNow(new Date()), 1000); return () => window.clearInterval(timer); }, []);
  return (
    <div className="clock-pill" aria-live="off">
      <Clock3 className="size-4 text-amber-300" />
      <div>{now ? <><div className="font-semibold tabular-nums text-foreground">{time.format(now)}</div><div className="text-[10px] text-muted-foreground">{date.format(now)} · Detroit time</div></> : <div className="text-xs text-muted-foreground">Loading local time…</div>}</div>
    </div>
  );
}
