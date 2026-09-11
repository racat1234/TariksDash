'use client';

import { Music2, Pause, Radio } from 'lucide-react';
import { useEffect, useState } from 'react';

type Track = { title: string; artist: string; artwork?: string; progress: number; playing: boolean };

export function MusicWidget() {
  const [track, setTrack] = useState<Track | null>(null);
  useEffect(() => {
    const read = () => {
      const music = (window as any).MusicKit?.getInstance?.(); const item = music?.nowPlayingItem;
      if (!item) return setTrack(null);
      const duration = Number(item.playbackDuration || 0); const current = Number(music.currentPlaybackTime || 0);
      setTrack({ title: item.title || 'Now Playing', artist: item.artistName || 'Apple Music', artwork: item.artworkURL?.replace('{w}', '700').replace('{h}', '700'), progress: duration ? Math.min(100, current / duration * 100) : 0, playing: Boolean(music.isPlaying) });
    };
    read(); const timer = window.setInterval(read, 1000); return () => window.clearInterval(timer);
  }, []);
  return <section className="dashboard-card music-card overflow-hidden" data-dashboard-section="music">
    {track?.playing ? <div className="relative flex min-h-44 items-end overflow-hidden p-5"><div className="absolute inset-0 scale-110 bg-cover bg-center opacity-45 blur-xl" style={{backgroundImage:`url(${track.artwork})`}}/><div className="relative flex w-full items-center gap-4"><img src={track.artwork} alt="Album artwork" className="size-24 rounded-2xl object-cover shadow-2xl"/><div className="min-w-0 flex-1"><div className="mb-3 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[.16em] text-white/60"><Radio className="size-3"/> Now playing</div><p className="truncate text-lg font-semibold text-white">{track.title}</p><p className="truncate text-sm text-white/65">{track.artist}</p><div className="mt-4 h-1 overflow-hidden rounded-full bg-white/20"><div className="h-full rounded-full bg-white transition-[width] duration-1000" style={{width:`${track.progress}%`}}/></div></div></div></div> : <div className="grid min-h-40 place-items-center p-6 text-center"><div><div className="mx-auto grid size-12 place-items-center rounded-2xl bg-rose-500/10 text-rose-300"><Pause className="size-5"/></div><p className="mt-3 text-sm font-semibold">Apple Music is quiet</p><p className="mt-1 text-xs text-muted-foreground">Your current track will appear here when MusicKit is connected and playing.</p></div></div>}
  </section>;
}
