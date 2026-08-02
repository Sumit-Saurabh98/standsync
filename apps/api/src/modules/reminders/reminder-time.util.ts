/** Subtract minutes from HH:mm (24h). Wraps at midnight. */
export function subtractMinutes(hhmm: string, minutes: number): string {
  const [hour, minute] = hhmm.split(':').map(Number);
  let total = hour * 60 + minute - minutes;
  total = ((total % (24 * 60)) + 24 * 60) % (24 * 60);
  const h = Math.floor(total / 60);
  const m = total % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

/** BullMQ cron pattern from HH:mm → `m H * * *` */
export function cronFromTime(hhmm: string): string {
  const [hour, minute] = hhmm.split(':');
  return `${Number(minute)} ${Number(hour)} * * *`;
}

export function reminderScheduleTimes(deadline: string, reminderTime: string) {
  return {
    primary: reminderTime,
    '15m': subtractMinutes(deadline, 15),
    final: deadline,
  } as const;
}
