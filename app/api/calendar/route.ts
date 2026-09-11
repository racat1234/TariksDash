import { env } from 'cloudflare:workers';
import ICAL from 'ical.js';

type CalendarEvent = { id: string; title: string; location: string | null; start: string; end: string; allDay: boolean };

function asDate(time: ICAL.Time) {
  return time.isDate ? new Date(Date.UTC(time.year, time.month - 1, time.day, 12)) : time.toJSDate();
}

export async function GET() {
  const feedUrl = String(env.CALENDAR_ICS_URL || '');
  if (!feedUrl) return Response.json({ configured: false, events: [] });
  try {
    const response = await fetch(feedUrl, { headers: { accept: 'text/calendar' } });
    if (!response.ok) throw new Error('Calendar feed unavailable');
    const root = new ICAL.Component(ICAL.parse(await response.text()));
    const now = new Date();
    const rangeStart = new Date(now.getTime() - 12 * 60 * 60 * 1000);
    const rangeEnd = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);
    const events: CalendarEvent[] = [];

    for (const component of root.getAllSubcomponents('vevent')) {
      const event = new ICAL.Event(component);
      if (event.isRecurrenceException()) continue;
      const add = (startTime: ICAL.Time, endTime: ICAL.Time, suffix = '') => {
        const start = asDate(startTime);
        const end = asDate(endTime);
        if (end < rangeStart || start > rangeEnd) return;
        events.push({ id: `${event.uid}${suffix}`, title: event.summary || 'Untitled event', location: event.location || null, start: start.toISOString(), end: end.toISOString(), allDay: startTime.isDate });
      };
      if (event.isRecurring()) {
        const iterator = event.iterator(ICAL.Time.fromJSDate(rangeStart, true));
        for (let count = 0; count < 250; count += 1) {
          const occurrence = iterator.next();
          if (!occurrence) break;
          const details = event.getOccurrenceDetails(occurrence);
          if (asDate(details.startDate) > rangeEnd) break;
          add(details.startDate, details.endDate, `:${occurrence.toString()}`);
        }
      } else {
        add(event.startDate, event.endDate);
      }
    }

    events.sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());
    return Response.json({ configured: true, events: events.slice(0, 12) }, { headers: { 'cache-control': 'private, max-age=300' } });
  } catch {
    return Response.json({ configured: true, error: 'Calendar is temporarily unavailable.', events: [] }, { status: 502 });
  }
}
