// Small date helpers shared by the routine tracker. Dates are always
// YYYY-MM-DD strings in the user's local timezone (never UTC-shifted).

export function toISO(d: Date): string {
  const off = d.getTimezoneOffset();
  return new Date(d.getTime() - off * 60_000).toISOString().slice(0, 10);
}

export function todayISO(): string {
  return toISO(new Date());
}

export function addDays(date: string, n: number): string {
  const d = new Date(`${date}T00:00:00`);
  d.setDate(d.getDate() + n);
  return toISO(d);
}

export function addMonths(date: string, n: number): string {
  const d = new Date(`${date}T00:00:00`);
  d.setMonth(d.getMonth() + n);
  return toISO(d);
}

export function formatDateLong(date: string): string {
  return new Date(`${date}T00:00:00`).toLocaleDateString(undefined, {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}
