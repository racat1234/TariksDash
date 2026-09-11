'use client';

import { ArrowUpRight, Loader2, MapPin, Newspaper } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';

type NewsItem = { title: string; link: string; publishedAt: string; source: string };

export function NewsCard() {
  const [items, setItems] = useState<NewsItem[]>([]);
  const [scope, setScope] = useState('Michigan');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const load = useCallback(async () => {
    try {
      const response = await fetch('/api/news');
      if (!response.ok) throw new Error();
      const payload = await response.json();
      setItems(payload.items || []); setScope(payload.scope || 'Michigan'); setError(false);
    } catch { setError(true); } finally { setLoading(false); }
  }, []);
  useEffect(() => {
    void load();
    const timer = window.setInterval(load, 15 * 60_000);
    const onFocus = () => void load();
    window.addEventListener('focus', onFocus);
    return () => { window.clearInterval(timer); window.removeEventListener('focus', onFocus); };
  }, [load]);

  return <section className="dashboard-card overflow-hidden">
    <div className="flex items-center justify-between border-b border-border/70 px-5 py-4">
      <div><div className="flex items-center gap-2 font-semibold"><Newspaper className="size-4 text-primary" /> News Brief</div><div className="mt-1 flex items-center gap-1 text-[10px] uppercase tracking-wider text-muted-foreground"><MapPin className="size-3" /> {scope}</div></div>
      <span className="text-[10px] text-muted-foreground">Updates automatically</span>
    </div>
    {loading ? <div className="grid min-h-40 place-items-center text-sm text-muted-foreground"><span className="flex items-center gap-2"><Loader2 className="size-4 animate-spin" /> Gathering headlines</span></div> : error ? <div className="p-6 text-center text-sm text-muted-foreground">News is taking a moment. It will retry automatically.</div> : <div>{items.map((item) => <a key={`${item.link}-${item.title}`} href={item.link} target="_blank" rel="noreferrer" className="group flex items-start gap-3 border-b border-border/60 px-5 py-4 transition last:border-0 hover:bg-secondary/45"><div className="min-w-0 flex-1"><p className="text-sm font-medium leading-5">{item.title}</p><p className="mt-1.5 text-[10px] text-muted-foreground">{item.source}{item.publishedAt ? ` · ${new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(new Date(item.publishedAt))}` : ''}</p></div><ArrowUpRight className="mt-0.5 size-4 shrink-0 text-muted-foreground transition group-hover:text-foreground" /></a>)}</div>}
  </section>;
}
