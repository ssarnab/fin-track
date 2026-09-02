import { supabase } from "@/lib/supabase";
import type { DayType, RoutineItem, RoutineDay, RoutineCheck } from "@/lib/types";

// ---- Templates (workday / offday time-blocks) ------------------------------

export async function listRoutineItems(dayType?: DayType): Promise<RoutineItem[]> {
  let q = supabase.from("routine_item").select("*").order("sort_order").order("id");
  if (dayType) q = q.eq("day_type", dayType);
  const { data, error } = await q;
  if (error) throw error;
  return data ?? [];
}

export async function createRoutineItem(
  dayType: DayType,
  title: string,
  startTime: string | null,
  endTime: string | null,
  sortOrder: number,
  category: string | null = null,
) {
  const { data, error } = await supabase
    .from("routine_item")
    .insert({ day_type: dayType, title: title.trim(), start_time: startTime, end_time: endTime, category, sort_order: sortOrder })
    .select()
    .single();
  if (error) throw error;
  return data as RoutineItem;
}

export async function updateRoutineItem(
  id: number,
  patch: Partial<Pick<RoutineItem, "title" | "start_time" | "end_time" | "category" | "sort_order">>,
) {
  const { error } = await supabase.from("routine_item").update(patch).eq("id", id);
  if (error) throw error;
}

export async function deleteRoutineItem(id: number) {
  const { error } = await supabase.from("routine_item").delete().eq("id", id);
  if (error) throw error;
}

// A full, gap-free 24-hour plan matching the transformation schedule —
// every block's start/end lines up with the next one's start, so the day
// sums to exactly 1440 minutes. Fully editable afterwards from Templates;
// also what "Reset to suggested plan" restores.
const PLAN_WORKDAY: { title: string; start: string; end: string; category: string }[] = [
  { title: "Freshen up", start: "08:00", end: "08:15", category: "Self-care" },
  { title: "Exercise (10 min)", start: "08:15", end: "08:30", category: "Exercise" },
  { title: "Shower", start: "08:30", end: "08:40", category: "Self-care" },
  { title: "Breakfast", start: "08:40", end: "08:50", category: "Meals" },
  { title: "Leave for office", start: "08:50", end: "09:00", category: "Commute" },
  { title: "Office", start: "09:00", end: "18:15", category: "Work" },
  { title: "Reach home", start: "18:15", end: "19:00", category: "Commute" },
  { title: "Shower / gochol", start: "19:00", end: "19:15", category: "Self-care" },
  { title: "Niloy", start: "19:15", end: "20:00", category: "Family" },
  { title: "Personal Work - plan", start: "20:00", end: "21:30", category: "Work" },
  { title: "Dinner", start: "21:30", end: "22:00", category: "Meals" },
  { title: "Rest", start: "22:00", end: "22:30", category: "Family" },
  { title: "Personal Work - execution", start: "22:30", end: "01:00", category: "Work" },
  { title: "Sleep", start: "01:00", end: "08:00", category: "Sleep" },
];

const PLAN_OFFDAY: { title: string; start: string; end: string; category: string }[] = [
  { title: "Wake up", start: "08:00", end: "08:10", category: "Self-care" },
  { title: "Freshen up", start: "08:10", end: "08:15", category: "Self-care" },
  { title: "Exercise", start: "08:15", end: "08:35", category: "Exercise" },
  { title: "Shower", start: "08:35", end: "08:55", category: "Self-care" },
  { title: "Breakfast", start: "08:55", end: "09:15", category: "Meals" },
  { title: "Personal work / project", start: "09:15", end: "13:00", category: "Work" },
  { title: "Lunch & rest", start: "13:00", end: "14:00", category: "Meals" },
  { title: "Personal work / errands", start: "14:00", end: "17:00", category: "Work" },
  { title: "Time with wife & family", start: "17:00", end: "19:00", category: "Family" },
  { title: "Dinner", start: "19:00", end: "19:30", category: "Meals" },
  { title: "Work session", start: "19:30", end: "22:00", category: "Work" },
  { title: "Wind down", start: "22:00", end: "00:30", category: "Rest" },
  { title: "Sleep", start: "00:30", end: "08:00", category: "Sleep" },
];

/** Seeds both templates the first time a user has no routine items at all. */
export async function ensureDefaultRoutineItems(): Promise<void> {
  const { count, error } = await supabase
    .from("routine_item")
    .select("id", { count: "exact", head: true });
  if (error) throw error;
  if ((count ?? 0) > 0) return;

  const rows = [
    ...PLAN_WORKDAY.map((it, i) => ({ day_type: "workday", title: it.title, start_time: it.start, end_time: it.end, category: it.category, sort_order: i })),
    ...PLAN_OFFDAY.map((it, i) => ({ day_type: "offday", title: it.title, start_time: it.start, end_time: it.end, category: it.category, sort_order: i })),
  ];
  const { error: insErr } = await supabase.from("routine_item").insert(rows);
  if (insErr && insErr.code !== "23505") throw insErr;
}

/** Wipes and rebuilds one template with the suggested 24h plan above — for
 * fixing up items that predate the time-block redesign, or just starting
 * over. Past check-ins for the deleted items go with them. */
export async function resetRoutineTemplate(dayType: DayType): Promise<void> {
  const { error: delErr } = await supabase.from("routine_item").delete().eq("day_type", dayType);
  if (delErr) throw delErr;

  const plan = dayType === "workday" ? PLAN_WORKDAY : PLAN_OFFDAY;
  const rows = plan.map((it, i) => ({ day_type: dayType, title: it.title, start_time: it.start, end_time: it.end, category: it.category, sort_order: i }));
  const { error: insErr } = await supabase.from("routine_item").insert(rows);
  if (insErr) throw insErr;
}

// ---- Per-date day-type assignment -------------------------------------------

/** Fridays/Saturdays default to "offday" — just a starting guess; the actual
 * off days shift week to week, so this is always overridable per date. */
export function guessDayType(date: string): DayType {
  const dow = new Date(`${date}T00:00:00`).getDay(); // 0=Sun..6=Sat
  return dow === 5 || dow === 6 ? "offday" : "workday";
}

/** Reads the day-type + schedule shift assigned to `date`, persisting a
 * guessed default day-type (shift 0) the first time it's looked at so later
 * stats always have a definite answer. */
export async function getOrCreateRoutineDay(date: string): Promise<{ dayType: DayType; shiftMinutes: number }> {
  const { data, error } = await supabase
    .from("routine_day")
    .select("day_type, shift_minutes")
    .eq("date", date)
    .maybeSingle();
  if (error) throw error;
  if (data) return { dayType: data.day_type as DayType, shiftMinutes: data.shift_minutes ?? 0 };

  const guess = guessDayType(date);
  const { error: upsertErr } = await supabase
    .from("routine_day")
    .upsert({ date, day_type: guess }, { onConflict: "uid,date" });
  if (upsertErr) throw upsertErr;
  return { dayType: guess, shiftMinutes: 0 };
}

export async function setRoutineDayType(date: string, dayType: DayType) {
  const { error } = await supabase
    .from("routine_day")
    .upsert({ date, day_type: dayType }, { onConflict: "uid,date" });
  if (error) throw error;
}

/** `day_type` has no column default, and Postgres validates an upsert's
 * would-be-inserted row (defaults and all) before it ever gets to checking
 * ON CONFLICT — so leaving day_type out 400s even when the row already
 * exists and only shift_minutes is meant to change. Read the current value
 * first and send it back unchanged, so the payload is always a complete,
 * valid row either way. */
export async function setRoutineDayShift(date: string, shiftMinutes: number) {
  const { dayType } = await getOrCreateRoutineDay(date);
  const { error } = await supabase
    .from("routine_day")
    .upsert({ date, day_type: dayType, shift_minutes: shiftMinutes }, { onConflict: "uid,date" });
  if (error) throw error;
}

export async function listRoutineDaysRange(from: string, to: string): Promise<RoutineDay[]> {
  const { data, error } = await supabase
    .from("routine_day")
    .select("*")
    .gte("date", from)
    .lte("date", to);
  if (error) throw error;
  return data ?? [];
}

// ---- Checks (what actually happened) ---------------------------------------

export async function listRoutineChecks(date: string): Promise<RoutineCheck[]> {
  const { data, error } = await supabase.from("routine_check").select("*").eq("date", date);
  if (error) throw error;
  return data ?? [];
}

export async function listRoutineChecksRange(from: string, to: string): Promise<RoutineCheck[]> {
  const { data, error } = await supabase
    .from("routine_check")
    .select("*")
    .gte("date", from)
    .lte("date", to);
  if (error) throw error;
  return data ?? [];
}

/** Logs what was actually done for a block — only actual_start/actual_end
 * are written (the upsert's ON CONFLICT DO UPDATE touches just the columns
 * present in the payload), so an existing note is never clobbered. */
export async function setRoutineCheckActual(date: string, itemId: number, actualStart: string, actualEnd: string) {
  const { error } = await supabase
    .from("routine_check")
    .upsert({ date, item_id: itemId, actual_start: actualStart, actual_end: actualEnd }, { onConflict: "uid,date,item_id" });
  if (error) throw error;
}

export async function clearRoutineCheckActual(date: string, itemId: number) {
  const { error } = await supabase
    .from("routine_check")
    .upsert({ date, item_id: itemId, actual_start: null, actual_end: null }, { onConflict: "uid,date,item_id" });
  if (error) throw error;
}

/** Skips one block for just this date — it won't count toward the day's
 * planned or actual totals at all (not "missed", just not part of today).
 * `excluded` has a column default, so this partial payload is safe even on
 * a first-ever insert for the date+item (unlike routine_day.day_type). */
export async function setRoutineCheckExcluded(date: string, itemId: number, excluded: boolean) {
  const { error } = await supabase
    .from("routine_check")
    .upsert({ date, item_id: itemId, excluded }, { onConflict: "uid,date,item_id" });
  if (error) throw error;
}

/** Records what actually happened instead, for a date+item — independent of
 * actual_start/actual_end, for the same reason as above. */
export async function setRoutineCheckNote(date: string, itemId: number, note: string) {
  const { error } = await supabase
    .from("routine_check")
    .upsert({ date, item_id: itemId, note: note.trim() || null }, { onConflict: "uid,date,item_id" });
  if (error) throw error;
}
