'use client';

import { BookOpen } from 'lucide-react';
import { useEffect, useLayoutEffect, useState } from 'react';

const verses = [
  { text: 'This is the day that the Lord has made; let us rejoice and be glad in it.', reference: 'Psalm 118:24' },
  { text: 'I can do all things through Christ who strengthens me.', reference: 'Philippians 4:13' },
  { text: 'Trust in the Lord with all your heart, and do not lean on your own understanding.', reference: 'Proverbs 3:5' },
  { text: 'The Lord is my shepherd; I shall not want.', reference: 'Psalm 23:1' },
  { text: 'Be strong and courageous. Do not be afraid; do not be discouraged.', reference: 'Joshua 1:9' },
  { text: 'Cast all your anxiety on him because he cares for you.', reference: '1 Peter 5:7' },
  { text: 'Let all that you do be done in love.', reference: '1 Corinthians 16:14' },
  { text: 'The light shines in the darkness, and the darkness has not overcome it.', reference: 'John 1:5' },
  { text: 'Be still, and know that I am God.', reference: 'Psalm 46:10' },
  { text: 'For we walk by faith, not by sight.', reference: '2 Corinthians 5:7' },
  { text: 'The joy of the Lord is your strength.', reference: 'Nehemiah 8:10' },
  { text: 'With God all things are possible.', reference: 'Matthew 19:26' },
];

function timeGreetings(hour: number) {
  if (hour < 5) return ['Still up, Tarik?', 'Late-night mode, Tarik.', 'Burning the midnight oil, Tarik?', 'Quiet hours, Tarik.'];
  if (hour < 12) return ['Rise and shine, Tarik.', 'Morning, Tarik. Let’s get it.', 'New day, new moves, Tarik.', 'Up and at ’em, Tarik.', 'What’s good this morning, Tarik?'];
  if (hour < 17) return ['What’s the move, Tarik?', 'Hope your day’s going strong, Tarik.', 'Keep it rolling, Tarik.', 'Afternoon check-in, Tarik.', 'You’ve got this, Tarik.'];
  if (hour < 22) return ['Evening vibes, Tarik.', 'How’d today treat you, Tarik?', 'Time to wind down, Tarik.', 'Good to see you, Tarik.', 'What’s good tonight, Tarik?'];
  return ['Night mode activated, Tarik.', 'Getting late, Tarik.', 'One last check-in, Tarik?', 'Easy does it tonight, Tarik.'];
}

function weatherGreetings(code: number | null) {
  if (code === null) return [];
  if (code === 0) return ['Clear skies, clear mind, Tarik.', 'The sky understood the assignment, Tarik.'];
  if (code >= 95) return ['Stormy out there—stay sharp, Tarik.', 'Thunder outside, focus inside, Tarik.'];
  if ((code >= 51 && code <= 67) || (code >= 80 && code <= 82)) return ['Rainy-day energy, Tarik.', 'Keep it cozy out there, Tarik.'];
  if ((code >= 71 && code <= 77) || (code >= 85 && code <= 86)) return ['Snow-day energy, Tarik.', 'Bundle up, Tarik.'];
  if (code >= 1 && code <= 48) return ['Cloudy, but we move, Tarik.', 'Gray skies can’t slow you down, Tarik.'];
  return [];
}

function chooseGreeting(options: string[]) {
  const previous = window.localStorage.getItem('dashboard-last-greeting');
  const choices = options.filter((item) => item !== previous);
  const greeting = (choices.length ? choices : options)[Math.floor(Math.random() * (choices.length || options.length))];
  window.localStorage.setItem('dashboard-last-greeting', greeting);
  return greeting;
}

export function DailyGreeting() {
  const [now, setNow] = useState<Date | null>(null);
  const [greeting, setGreeting] = useState('Hey, Tarik.');

  useLayoutEffect(() => {
    const current = new Date();
    setNow(current);
    const cachedWeatherValue = window.localStorage.getItem('dashboard-last-weather-code');
    const cachedWeather = cachedWeatherValue === null ? Number.NaN : Number(cachedWeatherValue);
    const options = [
      ...timeGreetings(current.getHours()),
      ...weatherGreetings(Number.isFinite(cachedWeather) ? cachedWeather : null),
    ];
    setGreeting(chooseGreeting(options));
  }, []);

  useEffect(() => {
    const updateWeatherCache = async () => {
      try {
        const position = await new Promise<GeolocationPosition>((resolve, reject) => navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 4000, maximumAge: 600_000 }));
        const response = await fetch(`/api/weather?latitude=${position.coords.latitude}&longitude=${position.coords.longitude}`);
        if (response.ok) {
          const weatherCode = Number((await response.json()).current?.weather_code);
          if (Number.isFinite(weatherCode)) window.localStorage.setItem('dashboard-last-weather-code', String(weatherCode));
        }
      } catch { /* The greeting already appeared using time and cached weather. */ }
    };
    void updateWeatherCache();
    const update = () => setNow(new Date());
    const timer = window.setInterval(update, 60_000);
    return () => window.clearInterval(timer);
  }, []);

  const current = now || new Date(0);
  const dayNumber = now ? Math.floor(new Date(current.getFullYear(), current.getMonth(), current.getDate()).getTime() / 86_400_000) : 0;
  const verse = verses[Math.abs(dayNumber) % verses.length];

  return (
    <div>
      <h1 data-dashboard-section="greeting" className="text-4xl font-semibold tracking-[-0.045em] sm:text-5xl">
        {greeting}
      </h1>
      <div data-dashboard-section="verse" className="mt-5 max-w-2xl rounded-2xl border border-primary/15 bg-primary/5 px-4 py-3.5">
        <div className="mb-2 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[.16em] text-primary/80"><BookOpen className="size-3.5" /> Verse of the Day</div>
        <div className="flex items-start gap-3">
        <BookOpen className="mt-0.5 size-4 shrink-0 text-primary" />
        <p className="text-sm leading-6 text-muted-foreground">
          “{verse.text}” <span className="ml-1 font-medium text-foreground/80">— {verse.reference}</span>
        </p>
        </div>
      </div>
    </div>
  );
}
