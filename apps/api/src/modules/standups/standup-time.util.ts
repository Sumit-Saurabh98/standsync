/** Team-local calendar helpers (IANA timezone). */

/** YYYY-MM-DD as a UTC midnight Date (for Prisma @db.Date). */
export function teamLocalDate(timezone: string, at = new Date()): Date {
  const ymd = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(at);
  return new Date(`${ymd}T00:00:00.000Z`);
}

/** 0 = Sunday … 6 = Saturday in the team's timezone. */
export function teamLocalWeekday(timezone: string, at = new Date()): number {
  const label = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    weekday: 'short',
  }).format(at);

  const map: Record<string, number> = {
    Sun: 0,
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
  };

  return map[label] ?? 0;
}

/** HH:mm (24-hour) in the team's timezone. */
export function teamLocalTime(timezone: string, at = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: timezone,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(at);

  const hour = parts.find((p) => p.type === 'hour')?.value ?? '00';
  const minute = parts.find((p) => p.type === 'minute')?.value ?? '00';
  return `${hour}:${minute}`;
}
