'use client';

import {
  BookOpen,
  CalendarClock,
  CloudRain,
  CloudSun,
  Expand,
  Grid2X2,
  LayoutPanelTop,
  ListTodo,
  MessageCircle,
  MoonStar,
  Newspaper,
  RotateCcw,
  Settings,
  Smartphone,
  Sparkles,
  TrendingUp,
  Wallpaper,
  X,
} from 'lucide-react';
import { useEffect, useState } from 'react';

const photos = [
  {
    image:
      'https://images.unsplash.com/photo-1642231683558-36b8c06eb39e?auto=format&fit=crop&w=2400&q=82',
    page: 'https://unsplash.com/photos/fxaaTprPGnY',
    credit: 'Benjamin Behre',
  },
  {
    image:
      'https://images.unsplash.com/photo-1635776062360-af423602aff3?auto=format&fit=crop&w=2400&q=82',
    page: 'https://unsplash.com/photos/87PP9Zd7MNo',
    credit: 'MagicPattern',
  },
  {
    image:
      'https://images.unsplash.com/photo-1757681688528-45275468d9da?auto=format&fit=crop&w=2400&q=82',
    page: 'https://unsplash.com/photos/VuV4qShSAmA',
    credit: 'Jack White',
  },
  {
    image:
      'https://images.unsplash.com/photo-1767247609304-e2742e30671a?auto=format&fit=crop&w=2400&q=82',
    page: 'https://unsplash.com/photos/Uqkdpahs-ew',
    credit: 'Mohammed Kara',
  },
];

const sectionOptions = [
  {
    id: 'greeting',
    label: 'Greeting',
    detail: 'Personal welcome message',
    Icon: MessageCircle,
  },
  {
    id: 'verse',
    label: 'Verse of the Day',
    detail: 'Daily Bible verse',
    Icon: BookOpen,
  },
  {
    id: 'schedule',
    label: 'Class schedule',
    detail: 'Current class and time left',
    Icon: CalendarClock,
  },
  {
    id: 'activities',
    label: 'Weekly activities',
    detail: 'Practice, tutoring, and plans',
    Icon: CalendarClock,
  },
  {
    id: 'weather',
    label: 'Weather',
    detail: 'Local conditions and forecast',
    Icon: CloudSun,
  },
  {
    id: 'sleep',
    label: 'Sleep',
    detail: 'Apple Watch sleep total',
    Icon: MoonStar,
  },
  {
    id: 'tasks',
    label: 'Tasks',
    detail: 'Your personal to-do list',
    Icon: ListTodo,
  },
  {
    id: 'markets',
    label: 'Markets',
    detail: 'Indices and Bitcoin',
    Icon: TrendingUp,
  },
  {
    id: 'news',
    label: 'News',
    detail: 'Michigan and U.S. headlines',
    Icon: Newspaper,
  },
] as const;

type SectionId = (typeof sectionOptions)[number]['id'];
type ScheduleMode = 'auto' | 'regular' | 'wednesday';
type Visibility = Record<SectionId, boolean>;
const defaultVisibility = Object.fromEntries(
  sectionOptions.map(({ id }) => [id, true]),
) as Visibility;

function applyVisibility(visibility: Visibility) {
  for (const { id } of sectionOptions)
    document.documentElement.classList.toggle(
      `dashboard-hide-${id}`,
      !visibility[id],
    );
}

type WeatherScene =
  | 'clear-day'
  | 'clear-night'
  | 'cloudy-day'
  | 'cloudy-night'
  | 'rain-day'
  | 'rain-night'
  | 'snow-day'
  | 'snow-night'
  | 'storm-day'
  | 'storm-night'
  | 'sunrise'
  | 'sunset';
type SceneDetails = {
  scene: WeatherScene;
  moonIllumination: number;
  waxing: boolean;
};

function baseScene(code: number, isDay: boolean): WeatherScene {
  const time = isDay ? 'day' : 'night';
  if (code >= 95) return `storm-${time}`;
  if ((code >= 51 && code <= 67) || (code >= 80 && code <= 82))
    return `rain-${time}`;
  if ((code >= 71 && code <= 77) || (code >= 85 && code <= 86))
    return `snow-${time}`;
  if (code >= 1 && code <= 48) return `cloudy-${time}`;
  return `clear-${time}`;
}

function lunarDetails(date = new Date()) {
  const synodicMonth = 29.53058867;
  const knownNewMoon = Date.UTC(2000, 0, 6, 18, 14);
  const phase =
    ((((date.getTime() - knownNewMoon) / 86_400_000 / synodicMonth) % 1) + 1) %
    1;
  return {
    moonIllumination: (1 - Math.cos(phase * Math.PI * 2)) / 2,
    waxing: phase < 0.5,
  };
}

function localMinutes(value?: string) {
  if (!value) return null;
  const match = value.match(/T(\d{2}):(\d{2})/);
  return match ? Number(match[1]) * 60 + Number(match[2]) : null;
}

function sceneDetails(payload: any): SceneDetails {
  const current = payload?.current || {};
  const code = Number(current.weather_code || 0);
  const isDay = Number(current.is_day) === 1;
  let scene = baseScene(code, isDay);
  if (code < 51) {
    const now = localMinutes(current.time);
    const sunrise = localMinutes(payload?.daily?.sunrise?.[0]);
    const sunset = localMinutes(payload?.daily?.sunset?.[0]);
    if (now !== null && sunrise !== null && Math.abs(now - sunrise) <= 50)
      scene = 'sunrise';
    else if (now !== null && sunset !== null && Math.abs(now - sunset) <= 55)
      scene = 'sunset';
  }
  return { scene, ...lunarDetails() };
}

function WeatherBackdrop({
  scene,
  details,
}: {
  scene?: WeatherScene;
  details?: SceneDetails;
}) {
  const resolved = details || {
    scene: scene || 'clear-night',
    ...lunarDetails(),
  };
  const { moonIllumination, waxing } = resolved;
  scene = resolved.scene;
  const rainy = scene.startsWith('rain') || scene.startsWith('storm');
  const snowy = scene.startsWith('snow');
  const night = scene.endsWith('night');
  const twilight = scene === 'sunrise' || scene === 'sunset';
  const moonShadow = Math.max(0, Math.min(1, 1 - moonIllumination));
  return (
    <div
      className={`weather-backdrop weather-scene-${scene}`}
      aria-hidden="true"
    >
      <div className="weather-sky-glow" />
      <div className="weather-horizon" />
      {scene === 'clear-day' &&
        Array.from({ length: 10 }, (_, index) => (
          <i
            key={`ray-${index}`}
            className="weather-sun-ray"
            style={{ '--i': index } as React.CSSProperties}
          />
        ))}
      {(night || twilight) && (
        <>
          <div
            className={`weather-moon ${waxing ? 'weather-moon-waxing' : 'weather-moon-waning'}`}
            style={{ '--moon-shadow': moonShadow } as React.CSSProperties}
          />
          {Array.from({ length: night ? 30 : 12 }, (_, index) => (
            <i
              key={`star-${index}`}
              className="weather-star"
              style={{ '--i': index } as React.CSSProperties}
            />
          ))}
        </>
      )}
      {rainy &&
        Array.from({ length: 38 }, (_, index) => (
          <i
            key={`rain-${index}`}
            className="weather-rain"
            style={{ '--i': index } as React.CSSProperties}
          />
        ))}
      {snowy &&
        Array.from({ length: 28 }, (_, index) => (
          <i
            key={`snow-${index}`}
            className="weather-snow"
            style={{ '--i': index } as React.CSSProperties}
          />
        ))}
      <div className="weather-cloud weather-cloud-one" />
      <div className="weather-cloud weather-cloud-two" />
    </div>
  );
}

export function BackgroundSwitcher() {
  const [unsplash, setUnsplash] = useState(false);
  const [photoIndex, setPhotoIndex] = useState(0);
  const [compact, setCompact] = useState(false);
  const [mobileAuto, setMobileAuto] = useState(true);
  const [open, setOpen] = useState(false);
  const [visibility, setVisibility] = useState<Visibility>(defaultVisibility);
  const [weatherMatch, setWeatherMatch] = useState(false);
  const [scheduleMode, setScheduleMode] = useState<ScheduleMode>('auto');
  const [weatherDetails, setWeatherDetails] = useState<SceneDetails | null>(
    null,
  );
  const weatherScene =
    weatherDetails?.scene ||
    (new Date().getHours() >= 19 || new Date().getHours() < 7
      ? 'clear-night'
      : 'clear-day');
  useEffect(() => {
    const savedCompact =
      window.localStorage.getItem('dashboard-layout') === 'compact';
    const savedMobileAuto =
      window.localStorage.getItem('dashboard-mobile-auto') !== 'off';
    const savedVisibility = window.localStorage.getItem('dashboard-visibility');
    let nextVisibility = defaultVisibility;
    try {
      nextVisibility = {
        ...defaultVisibility,
        ...(savedVisibility ? JSON.parse(savedVisibility) : {}),
      };
    } catch {
      /* Keep defaults if old settings are invalid. */
    }
    setVisibility(nextVisibility);
    applyVisibility(nextVisibility);
    setUnsplash(window.localStorage.getItem('codex-background') === 'unsplash');
    setWeatherMatch(
      window.localStorage.getItem('dashboard-weather-background') === 'on',
    );
    setScheduleMode(
      (window.localStorage.getItem(
        'dashboard-schedule-mode',
      ) as ScheduleMode) || 'auto',
    );
    const cachedWeather = window.localStorage.getItem('dashboard-last-weather');
    if (cachedWeather) {
      try {
        setWeatherDetails(sceneDetails(JSON.parse(cachedWeather)));
      } catch {
        /* Fresh weather will replace invalid cache. */
      }
    }
    setCompact(savedCompact);
    setMobileAuto(savedMobileAuto);
    document.documentElement.classList.toggle(
      'dashboard-mobile-auto-disabled',
      !savedMobileAuto,
    );
    document.documentElement.classList.toggle(
      'dashboard-compact',
      savedCompact,
    );
    setPhotoIndex(Math.floor(Date.now() / 600_000) % photos.length);
    const timer = window.setInterval(
      () => setPhotoIndex(Math.floor(Date.now() / 600_000) % photos.length),
      60_000,
    );
    return () => window.clearInterval(timer);
  }, []);
  useEffect(() => {
    if (!weatherMatch) return;
    const loadScene = async () => {
      let query = '';
      try {
        const position = await new Promise<GeolocationPosition>(
          (resolve, reject) =>
            navigator.geolocation.getCurrentPosition(resolve, reject, {
              timeout: 5000,
              maximumAge: 600_000,
            }),
        );
        query = `?latitude=${position.coords.latitude}&longitude=${position.coords.longitude}`;
      } catch {
        /* Weather API uses the dashboard fallback location. */
      }
      try {
        const response = await fetch(`/api/weather${query}`);
        if (response.ok) {
          const payload = await response.json();
          window.localStorage.setItem(
            'dashboard-last-weather',
            JSON.stringify(payload),
          );
          setWeatherDetails(sceneDetails(payload));
          return;
        }
        const cached = window.localStorage.getItem('dashboard-last-weather');
        if (cached) setWeatherDetails(sceneDetails(JSON.parse(cached)));
      } catch {
        const cached = window.localStorage.getItem('dashboard-last-weather');
        if (cached) {
          try {
            setWeatherDetails(sceneDetails(JSON.parse(cached)));
          } catch {
            /* Keep the current scene until retry. */
          }
        }
      }
    };
    void loadScene();
    const timer = window.setInterval(loadScene, 10 * 60_000);
    return () => window.clearInterval(timer);
  }, [weatherMatch]);
  const toggle = () =>
    setUnsplash((value) => {
      const next = !value;
      if (next) {
        setWeatherMatch(false);
        window.localStorage.setItem('dashboard-weather-background', 'off');
      }
      window.localStorage.setItem(
        'codex-background',
        next ? 'unsplash' : 'ambient',
      );
      return next;
    });
  const toggleWeatherMatch = () =>
    setWeatherMatch((value) => {
      const next = !value;
      if (next) {
        setUnsplash(false);
        window.localStorage.setItem('codex-background', 'ambient');
      }
      window.localStorage.setItem(
        'dashboard-weather-background',
        next ? 'on' : 'off',
      );
      return next;
    });
  const toggleCompact = () =>
    setCompact((value) => {
      const next = !value;
      window.localStorage.setItem(
        'dashboard-layout',
        next ? 'compact' : 'expanded',
      );
      document.documentElement.classList.toggle('dashboard-compact', next);
      return next;
    });
  const toggleMobileAuto = () =>
    setMobileAuto((value) => {
      const next = !value;
      window.localStorage.setItem('dashboard-mobile-auto', next ? 'on' : 'off');
      document.documentElement.classList.toggle(
        'dashboard-mobile-auto-disabled',
        !next,
      );
      return next;
    });
  const toggleSection = (id: SectionId) =>
    setVisibility((current) => {
      const next = { ...current, [id]: !current[id] };
      window.localStorage.setItem('dashboard-visibility', JSON.stringify(next));
      applyVisibility(next);
      return next;
    });
  const changeSchedule = (mode: ScheduleMode) => {
    setScheduleMode(mode);
    window.localStorage.setItem('dashboard-schedule-mode', mode);
    window.dispatchEvent(
      new CustomEvent('dashboard-schedule-mode', { detail: mode }),
    );
  };
  const resetDashboard = () => {
    setVisibility(defaultVisibility);
    applyVisibility(defaultVisibility);
    setCompact(false);
    setMobileAuto(true);
    setUnsplash(false);
    setWeatherMatch(false);
    document.documentElement.classList.remove(
      'dashboard-compact',
      'dashboard-mobile-auto-disabled',
    );
    window.localStorage.removeItem('dashboard-visibility');
    window.localStorage.removeItem('dashboard-layout');
    window.localStorage.removeItem('dashboard-mobile-auto');
    window.localStorage.removeItem('codex-background');
    window.localStorage.removeItem('dashboard-weather-background');
  };
  const toggleFullscreen = async () => {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await document.documentElement.requestFullscreen();
    } catch {
      /* Not available in every iOS browser mode. */
    }
  };
  const photo = photos[photoIndex];
  return (
    <>
      {open && (
        <button
          type="button"
          className="settings-dismiss"
          aria-label="Close settings"
          onClick={() => setOpen(false)}
        />
      )}
      {weatherMatch && <WeatherBackdrop scene={weatherScene} />}
      {unsplash && (
        <div
          className="unsplash-background"
          style={{
            backgroundImage: `linear-gradient(rgba(8,11,20,.76),rgba(8,11,20,.9)),url(${photo.image})`,
          }}
          aria-hidden="true"
        />
      )}
      <div className="settings-controls">
        {open && (
          <div className="settings-menu settings-menu-scroll">
            <div className="flex items-center justify-between px-1 pb-2">
              <span className="text-xs font-semibold text-white">
                Dashboard settings
              </span>
              <button
                onClick={() => setOpen(false)}
                className="rounded-lg p-1 text-white/50 hover:bg-white/10 hover:text-white"
                aria-label="Close settings"
              >
                <X className="size-3.5" />
              </button>
            </div>
            <button
              onClick={toggle}
              className="settings-option"
              aria-pressed={unsplash}
            >
              {unsplash ? <Sparkles /> : <Wallpaper />}
              <span>
                <strong>Ambient picture</strong>
                <small>
                  {unsplash
                    ? 'On · rotates automatically'
                    : 'Off · gradient background'}
                </small>
              </span>
              <i
                className={
                  unsplash
                    ? 'settings-switch settings-switch-on'
                    : 'settings-switch'
                }
              />
            </button>
            <button
              onClick={toggleWeatherMatch}
              className="settings-option"
              aria-pressed={weatherMatch}
            >
              <CloudRain />
              <span>
                <strong>Match outside</strong>
                <small>
                  {weatherMatch
                    ? 'On · live weather ambience'
                    : 'Weather-reactive background'}
                </small>
              </span>
              <i
                className={
                  weatherMatch
                    ? 'settings-switch settings-switch-on'
                    : 'settings-switch'
                }
              />
            </button>
            <button
              onClick={toggleCompact}
              className="settings-option"
              aria-pressed={compact}
            >
              {compact ? <Grid2X2 /> : <LayoutPanelTop />}
              <span>
                <strong>Compact layout</strong>
                <small>
                  {compact ? 'Cards side by side' : 'Cards stacked'}
                </small>
              </span>
              <i
                className={
                  compact
                    ? 'settings-switch settings-switch-on'
                    : 'settings-switch'
                }
              />
            </button>
            <button
              onClick={toggleMobileAuto}
              className="settings-option"
              aria-pressed={mobileAuto}
            >
              <Smartphone />
              <span>
                <strong>Auto mobile layout</strong>
                <small>
                  {mobileAuto
                    ? 'On · optimized for your phone'
                    : 'Off · use full desktop spacing'}
                </small>
              </span>
              <i
                className={
                  mobileAuto
                    ? 'settings-switch settings-switch-on'
                    : 'settings-switch'
                }
              />
            </button>
            <button onClick={toggleFullscreen} className="settings-option">
              <Expand />
              <span>
                <strong>Fullscreen kiosk</strong>
                <small>Edge-to-edge dashboard view</small>
              </span>
            </button>
            <button onClick={() => window.dispatchEvent(new Event('dashboard:preview-breaking'))} className="settings-option">
              <span>Preview breaking-news ticker</span>
              <span className="settings-option-hint">Test</span>
            </button>
            <div className="mx-2 my-2 border-t border-white/10" />
            <div className="px-2 pb-1 pt-1 text-[9px] font-bold uppercase tracking-[.16em] text-white/35">
              Show on dashboard
            </div>
            {sectionOptions.map(({ id, label, detail, Icon }) => (
              <div key={id}>
                <button
                  onClick={() => toggleSection(id)}
                  className="settings-option"
                  aria-pressed={visibility[id]}
                >
                  <Icon />
                  <span>
                    <strong>{label}</strong>
                    <small>{detail}</small>
                  </span>
                  <i
                    className={
                      visibility[id]
                        ? 'settings-switch settings-switch-on'
                        : 'settings-switch'
                    }
                  />
                </button>
                {id === 'schedule' && visibility.schedule && (
                  <label className="settings-schedule-mode">
                    <span>Schedule mode</span>
                    <select
                      value={scheduleMode}
                      onChange={(event) =>
                        changeSchedule(event.target.value as ScheduleMode)
                      }
                    >
                      <option value="auto">Automatic</option>
                      <option value="regular">Regular schedule</option>
                      <option value="wednesday">Wednesday schedule</option>
                    </select>
                  </label>
                )}
              </div>
            ))}
            <div className="mx-2 my-2 border-t border-white/10" />
            <button onClick={resetDashboard} className="settings-option">
              <RotateCcw />
              <span>
                <strong>Reset dashboard</strong>
                <small>Show everything with default styling</small>
              </span>
            </button>
            {unsplash && (
              <a
                href={`${photo.page}?utm_source=tarik_dashboard&utm_medium=referral`}
                target="_blank"
                rel="noreferrer"
                className="mt-2 block px-2 text-[9px] text-white/40 hover:text-white/70"
              >
                Photo by {photo.credit} on Unsplash
              </a>
            )}
          </div>
        )}
        <button
          onClick={() => setOpen((value) => !value)}
          className="settings-button"
          aria-expanded={open}
          aria-label="Dashboard settings"
        >
          <Settings className="size-4" />
        </button>
      </div>
    </>
  );
}
