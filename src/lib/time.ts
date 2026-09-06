// Time-of-day helpers for the routine tracker's time-blocks. Values are
// "HH:MM" strings (24h); a block whose end is earlier than its start is
// treated as wrapping past midnight (e.g. 22:00 → 01:00).

export function toMinutes(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + (m || 0);
}

export function fromMinutes(mins: number): string {
  const m = ((mins % 1440) + 1440) % 1440;
  const h = Math.floor(m / 60);
  const mm = m % 60;
  return `${String(h).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
}

/** Duration in minutes from `start` to `end`, wrapping past midnight if
 * `end` is earlier in the clock than `start`. */
export function duration(start: string, end: string): number {
  const s = toMinutes(start);
  const e = toMinutes(end);
  return e >= s ? e - s : 1440 - s + e;
}

export function formatDuration(mins: number): string {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h && m) return `${h}h ${m}m`;
  if (h) return `${h}h`;
  return `${m}m`;
}

/** Shifts a "HH:MM" time by `minutes` (+later, -earlier), wrapping at 24h. */
export function shiftTime(t: string, minutes: number): string {
  return fromMinutes(toMinutes(t) + minutes);
}

export function formatShift(minutes: number): string {
  if (minutes === 0) return "On schedule";
  const sign = minutes > 0 ? "+" : "-";
  return `${sign}${formatDuration(Math.abs(minutes))}`;
}

/** Renders "HH:MM" as "8:00 AM" for display. */
export function formatClock(t: string): string {
  const [h, m] = t.split(":").map(Number);
  const period = h < 12 ? "AM" : "PM";
  const h12 = h % 12 || 12;
  return `${h12}:${String(m).padStart(2, "0")} ${period}`;
}

/** Minutes of the actual window [aStart, aEnd) that land inside the planned
 * window [pStart, pEnd) on a circular 24h clock. Either window may wrap past
 * midnight, so the actual one is also tried offset by ±24h — "planned
 * 22:00→01:00, logged 23:00→00:30" has to overlap the way a human reads it.
 *
 * This — not the raw logged duration — is what "% achieved" means: sleeping
 * a full 6 hours but starting an hour late only hits the plan for 5 of them. */
export function overlapMinutes(pStart: string, pEnd: string, aStart: string, aEnd: string): number {
  const ps = toMinutes(pStart);
  const pe = ps + duration(pStart, pEnd);
  const as = toMinutes(aStart);
  const ae = as + duration(aStart, aEnd);
  let best = 0;
  for (const offset of [-1440, 0, 1440]) {
    const lo = Math.max(ps, as + offset);
    const hi = Math.min(pe, ae + offset);
    if (hi > lo) best = Math.max(best, hi - lo);
  }
  return best;
}

/** Signed distance from `from` to `to` on the circular clock, in minutes,
 * taking the shorter way round: always within [-720, 720]. "08:35 against a
 * planned 08:00" is +35, and "23:50 against a planned 00:10" is -20 rather
 * than +1420. */
export function signedOffset(from: string, to: string): number {
  const d = (((toMinutes(to) - toMinutes(from)) % 1440) + 1440) % 1440;
  return d > 720 ? d - 1440 : d;
}
