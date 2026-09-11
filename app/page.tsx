import { Bot } from 'lucide-react';
import { TodoList } from '@/components/todo-list';
import { WeatherCard } from '@/components/weather-card';
import { LiveClock } from '@/components/live-clock';
import { BackgroundSwitcher } from '@/components/background-switcher';
import { SleepCard } from '@/components/sleep-card';
import { DailyGreeting } from '@/components/daily-greeting';
import { NewsCard } from '@/components/news-card';
import { ClassSchedule } from '@/components/class-schedule';
import { WeeklyActivities } from '@/components/weekly-activities';
import { MarketsCard } from '@/components/markets-card';
import { BreakingNewsBanner } from '@/components/breaking-news-banner';
import { DashboardMaintenance } from '@/components/dashboard-maintenance';

export default function Home() {
  return (
    <main className="dashboard-scene min-h-screen overflow-hidden bg-background text-foreground">
      <BackgroundSwitcher />
      <DashboardMaintenance />
      <div className="ambient-orb ambient-orb-one" aria-hidden="true" />
      <div className="ambient-orb ambient-orb-two" aria-hidden="true" />
      <div className="dashboard-shell relative mx-auto min-h-screen max-w-6xl px-5 pb-16 pt-6 sm:px-8 lg:px-12">
        <header className="dashboard-header flex items-center justify-between border-b border-border/70 pb-5">
          <div className="flex items-center gap-3">
            <div className="grid size-10 place-items-center rounded-2xl bg-primary text-primary-foreground shadow-[0_10px_35px_-14px_rgba(245,180,89,.5)]"><Bot className="size-5" /></div>
            <div className="font-semibold tracking-tight">Tarik’s daily dashboard</div>
          </div>
          <div className="flex items-center gap-3"><LiveClock /><div className="hidden items-center gap-2 rounded-full border border-emerald-400/15 bg-emerald-400/8 px-3 py-1.5 text-xs text-emerald-300 sm:flex"><span className="size-1.5 animate-pulse rounded-full bg-emerald-400" /> Live</div></div>
        </header>

        <section className="dashboard-hero pb-9 pt-10 sm:pt-14">
          <p className="eyebrow">Your home base</p>
          <div className="mt-3"><DailyGreeting /></div>
        </section>

        <div className="dashboard-grid mx-auto max-w-4xl">
          <ClassSchedule />
          <WeeklyActivities />
          <div data-dashboard-section="weather"><WeatherCard /></div>
          <div data-dashboard-section="sleep"><SleepCard /></div>
          <div data-dashboard-section="tasks"><TodoList /></div>
          <MarketsCard />
          <div data-dashboard-section="news"><NewsCard /></div>
        </div>
        <footer className="pb-2 pt-12 text-center text-[11px] text-muted-foreground/70">This website was made with lots of love from Tarik.</footer>
      </div>
      <BreakingNewsBanner />
    </main>
  );
}
