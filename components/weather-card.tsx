'use client';

import { AlertTriangle, ChevronDown, Cloud, CloudDrizzle, CloudFog, CloudLightning, CloudMoon, CloudRain, CloudSun, Droplets, Loader2, MapPin, Moon, Snowflake, Sun, Sunset, Wind } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

type WeatherAlert = { id: string; event: string; headline: string; severity: string; urgency: string; instruction: string | null; description: string | null; expires: string | null };
type Weather = {
  current: { time: string; temperature_2m: number; apparent_temperature: number; relative_humidity_2m: number; precipitation: number; weather_code: number; wind_speed_10m: number; is_day: number };
  hourly: { time: string[]; temperature_2m: number[]; apparent_temperature: number[]; precipitation_probability: number[]; weather_code: number[]; wind_speed_10m: number[]; is_day: number[] };
  daily: { time: string[]; weather_code: number[]; temperature_2m_max: number[]; temperature_2m_min: number[]; precipitation_probability_max: number[]; sunrise: string[]; sunset: string[] };
  alerts: WeatherAlert[];
};

function condition(code: number, isDay = true) {
  if (code === 0) return { label: 'Clear', Icon: isDay ? Sun : Moon };
  if (code <= 2) return { label: 'Partly cloudy', Icon: isDay ? CloudSun : CloudMoon };
  if (code === 3) return { label: 'Overcast', Icon: Cloud };
  if (code <= 48) return { label: 'Foggy', Icon: CloudFog };
  if (code <= 57) return { label: 'Drizzle', Icon: CloudDrizzle };
  if (code <= 67 || (code >= 80 && code <= 82)) return { label: 'Rain', Icon: CloudRain };
  if (code <= 77 || (code >= 85 && code <= 86)) return { label: 'Snow', Icon: Snowflake };
  return { label: 'Thunderstorms', Icon: CloudLightning };
}

function hourLabel(value: string, first: boolean) {
  if (first) return 'Now';
  const hour = Number(value.slice(11, 13));
  return `${hour % 12 || 12}${hour >= 12 ? 'p' : 'a'}`;
}

function timeLabel(value: string) {
  return new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit' }).format(new Date(value));
}

async function loadDirectWeather(coordinates: { latitude: number; longitude: number } | null) {
  const latitude = coordinates?.latitude ?? 42.73586;
  const longitude = coordinates?.longitude ?? -83.41883;
  const url = new URL('https://api.open-meteo.com/v1/forecast');
  url.search = new URLSearchParams({ latitude: String(latitude), longitude: String(longitude), current: 'temperature_2m,apparent_temperature,relative_humidity_2m,precipitation,weather_code,wind_speed_10m,is_day', hourly: 'temperature_2m,apparent_temperature,precipitation_probability,weather_code,wind_speed_10m,is_day', daily: 'weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,sunrise,sunset', temperature_unit: 'fahrenheit', wind_speed_unit: 'mph', precipitation_unit: 'inch', timezone: 'auto', forecast_days: '5' }).toString();
  const response = await fetch(url);
  if (!response.ok) throw new Error();
  return { ...(await response.json()), alerts: [] };
}

export function WeatherCard() {
  const [weather, setWeather] = useState<Weather | null>(null);
  const [error, setError] = useState(false);
  const [alertsOpen, setAlertsOpen] = useState(false);
  const [coordinates, setCoordinates] = useState<{ latitude: number; longitude: number } | null>(null);
  const [locationStatus, setLocationStatus] = useState<'locating' | 'device' | 'fallback'>('locating');
  const load = useCallback(async () => {
    const query = coordinates ? `?latitude=${coordinates.latitude}&longitude=${coordinates.longitude}` : '';
    try { const response = await fetch(`/api/weather${query}`); const payload = response.ok ? await response.json() : await loadDirectWeather(coordinates); setWeather(payload); window.localStorage.setItem('dashboard-last-weather', JSON.stringify(payload)); setError(false); } catch { try { const payload = await loadDirectWeather(coordinates); setWeather(payload); window.localStorage.setItem('dashboard-last-weather', JSON.stringify(payload)); setError(false); return; } catch { /* Use the last successful forecast below. */ } const cached = window.localStorage.getItem('dashboard-last-weather'); if (cached) { try { setWeather(JSON.parse(cached)); setError(false); return; } catch { /* Ignore invalid old cache. */ } } setError(true); }
  }, [coordinates]);
  useEffect(() => {
    if (!navigator.geolocation) { setLocationStatus('fallback'); return; }
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => { setCoordinates({ latitude: Number(coords.latitude.toFixed(4)), longitude: Number(coords.longitude.toFixed(4)) }); setLocationStatus('device'); },
      () => setLocationStatus('fallback'),
      { enableHighAccuracy: false, timeout: 8_000, maximumAge: 10 * 60_000 },
    );
  }, []);
  useEffect(() => { void load(); const timer = window.setInterval(load, 2 * 60_000); const onFocus = () => void load(); window.addEventListener('focus', onFocus); return () => { window.clearInterval(timer); window.removeEventListener('focus', onFocus); }; }, [load]);
  const hourlyStart = useMemo(() => Math.max(0, weather?.hourly.time.findIndex((item) => item >= weather.current.time) ?? 0), [weather]);

  if (!weather && !error) return <section className="weather-card grid min-h-72 place-items-center"><div className="flex items-center gap-2 text-sm text-slate-300"><Loader2 className="size-4 animate-spin" /> Finding your local weather</div></section>;
  if (!weather) return <section className="weather-card grid min-h-72 place-items-center text-center"><div><Cloud className="mx-auto size-8 text-slate-400" /><p className="mt-3 font-medium">Weather is taking a moment.</p><p className="mt-1 text-xs text-slate-400">It will retry automatically.</p></div></section>;

  const now = condition(weather.current.weather_code, weather.current.is_day === 1);
  const NowIcon = now.Icon;
  const activeAlert = weather.alerts[0];
  return (
    <section className="weather-card relative overflow-hidden">
      <div className="relative p-6 sm:p-8">
        <div className="absolute -right-16 -top-20 size-72 rounded-full bg-sky-400/10 blur-3xl" />
        <div className="relative flex items-start justify-between gap-4">
          <div><div className="flex items-center gap-2 text-xs font-medium text-slate-300"><MapPin className="size-3.5" /> {locationStatus === 'device' ? 'Your current location' : locationStatus === 'locating' ? 'Finding your location' : 'Clarkston, MI · location fallback'}</div><div className="mt-6 flex items-end gap-5"><NowIcon className="weather-float mb-2 size-14 text-amber-200" strokeWidth={1.35} /><div><div className="text-6xl font-semibold tracking-[-0.07em] sm:text-7xl">{Math.round(weather.current.temperature_2m)}°</div><div className="mt-1 text-sm text-slate-300">{now.label} · Feels like {Math.round(weather.current.apparent_temperature)}°</div></div></div></div>
          <div className="flex flex-col items-end gap-2">{activeAlert && <button onClick={() => setAlertsOpen((value) => !value)} className="flex items-center gap-1.5 rounded-full border border-amber-300/30 bg-amber-300/15 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-amber-200 shadow-lg backdrop-blur" aria-expanded={alertsOpen}><AlertTriangle className="size-3.5" /> {weather.alerts.length} alert{weather.alerts.length > 1 ? 's' : ''}<ChevronDown className={`size-3 transition ${alertsOpen ? 'rotate-180' : ''}`} /></button>}</div>
        </div>
        {activeAlert && alertsOpen && <div className="relative mt-5 rounded-2xl border border-amber-300/25 bg-amber-950/45 p-4 text-sm shadow-2xl backdrop-blur-xl"><div className="flex items-start gap-3"><AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-300" /><div><div className="font-semibold text-amber-100">{activeAlert.event}</div><p className="mt-1 text-xs leading-5 text-amber-50/75">{activeAlert.headline}</p>{activeAlert.instruction && <p className="mt-2 line-clamp-3 text-xs leading-5 text-slate-300">{activeAlert.instruction}</p>}</div></div></div>}
        <div className="relative mt-8 flex flex-wrap gap-5 border-t border-white/10 pt-5 text-xs text-slate-300"><span className="flex items-center gap-2"><Droplets className="size-3.5 text-sky-300" /> {weather.current.relative_humidity_2m}% humidity</span><span className="flex items-center gap-2"><Wind className="size-3.5 text-sky-300" /> {Math.round(weather.current.wind_speed_10m)} mph wind</span><span className="flex items-center gap-2"><CloudRain className="size-3.5 text-sky-300" /> {weather.daily.precipitation_probability_max[0]}% rain</span><span className="flex items-center gap-2"><Sunset className="size-3.5 text-orange-300" /> Sunset {timeLabel(weather.daily.sunset[0])}</span></div>
      </div>

      <Tabs defaultValue="daily" className="gap-0 border-t border-white/10 bg-black/10">
        <div className="flex items-center justify-between px-4 py-3 sm:px-6"><span className="text-[10px] font-bold uppercase tracking-[.16em] text-slate-400">Forecast</span><TabsList className="h-8 bg-white/6"><TabsTrigger value="daily" className="px-3 text-xs data-active:bg-white/10 data-active:text-white">5 day</TabsTrigger><TabsTrigger value="hourly" className="px-3 text-xs data-active:bg-white/10 data-active:text-white">Hourly</TabsTrigger></TabsList></div>
        <TabsContent value="daily"><div className="grid grid-cols-5 border-t border-white/10">{weather.daily.time.map((date, index) => { const item = condition(weather.daily.weather_code[index]); const Icon = item.Icon; const day = index === 0 ? 'Today' : new Intl.DateTimeFormat('en-US', { weekday: 'short', timeZone: 'America/Detroit' }).format(new Date(`${date}T12:00:00`)); return <div key={date} className="border-r border-white/8 px-2 py-4 text-center last:border-0 sm:px-3"><div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">{day}</div><Icon className="mx-auto my-3 size-5 text-slate-200" /><div className="text-xs"><strong>{Math.round(weather.daily.temperature_2m_max[index])}°</strong><span className="ml-1 text-slate-500">{Math.round(weather.daily.temperature_2m_min[index])}°</span></div></div>; })}</div></TabsContent>
        <TabsContent value="hourly"><div className="flex snap-x overflow-x-auto border-t border-white/10">{weather.hourly.time.slice(hourlyStart, hourlyStart + 12).map((time, offset) => { const index = hourlyStart + offset; const item = condition(weather.hourly.weather_code[index], weather.hourly.is_day[index] === 1); const Icon = item.Icon; return <div key={time} className="min-w-[74px] snap-start border-r border-white/8 px-3 py-4 text-center last:border-0"><div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">{hourLabel(time, offset === 0)}</div><Icon className="mx-auto my-3 size-5 text-slate-200" /><div className="text-sm font-semibold">{Math.round(weather.hourly.temperature_2m[index])}°</div><div className="mt-1 text-[10px] text-sky-300">{weather.hourly.precipitation_probability[index]}% rain</div></div>; })}</div></TabsContent>
      </Tabs>
    </section>
  );
}
