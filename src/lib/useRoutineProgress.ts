"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { listRoutineItems, listRoutineDaysRange, listRoutineChecksRange, guessDayType } from "@/lib/routine";
import { dayProgress } from "@/lib/routineCalc";
import { useRealtime } from "@/lib/useRealtime";
import { addDays, addMonths, todayISO } from "@/lib/date";
import type { DayType, RoutineItem, RoutineDay, RoutineCheck } from "@/lib/types";

export type DailyProgress = {
  date: string;
  dayType: DayType;
  plannedMin: number;
  achievedMin: number;
  loggedMin: number;
  pct: number;
};
export type NoteEntry = { date: string; itemTitle: string; note: string };
/** Where the hours actually went, per category — deliberately separate from
 * the achievement %: this answers "how much did I sleep", not "did I sleep
 * when I planned to". */
export type CategoryTotal = {
  category: string;
  minutes: number; // total logged over the window
  avgPerDay: number; // per day that had anything logged
  plannedAvgPerDay: number; // what the plan asked for on those same days
  pct: number; // share of all logged time
};

// A day counts toward the streak / "on target" tally at this % — a couple
// of minutes of timing slop shouldn't erase an otherwise on-target day, but
// this is still the time-weighted %, not a lenient item count.
const STREAK_THRESHOLD = 90;

/** Day-by-day (and overall) achievement across the whole transformation
 * window, time-weighted by each block's planned duration. Covers every day
 * from `startDate` up to today (or the window's end) — a day the app was
 * never opened on has no logged blocks at all, which is exactly what
 * "didn't do it" looks like, so it counts as 0% rather than being silently
 * skipped. Future days aren't judged yet. */
export function useRoutineProgress(startDate: string, months = 4) {
  const endDate = useMemo(() => addDays(addMonths(startDate, months), -1), [startDate, months]);
  const today = todayISO();
  const rangeEnd = today < endDate ? today : endDate;

  const [items, setItems] = useState<RoutineItem[]>([]);
  const [days, setDays] = useState<RoutineDay[]>([]);
  const [checks, setChecks] = useState<RoutineCheck[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const [its, ds, cks] = await Promise.all([
        listRoutineItems(),
        listRoutineDaysRange(startDate, rangeEnd),
        listRoutineChecksRange(startDate, rangeEnd),
      ]);
      setItems(its);
      setDays(ds);
      setChecks(cks);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load progress");
    } finally {
      setLoading(false);
    }
  }, [startDate, rangeEnd]);

  useEffect(() => {
    load();
  }, [load]);
  useRealtime(["routine_item", "routine_day", "routine_check"], load);

  const data = useMemo(() => {
    const itemsByType: Record<DayType, RoutineItem[]> = {
      workday: items.filter((i) => i.day_type === "workday"),
      offday: items.filter((i) => i.day_type === "offday"),
    };
    const dayTypeByDate = new Map(days.map((d) => [d.date, d.day_type]));
    const shiftByDate = new Map(days.map((d) => [d.date, d.shift_minutes ?? 0]));
    const checksByDate = new Map<string, Map<number, RoutineCheck>>();
    for (const c of checks) {
      if (!checksByDate.has(c.date)) checksByDate.set(c.date, new Map());
      checksByDate.get(c.date)!.set(c.item_id, c);
    }

    // Hours logged per category, plus what the plan asked for on the days
    // that were actually logged — so "Sleep 6h 10m/day vs 7h planned" is a
    // fair comparison instead of being diluted by days never opened.
    const catLogged = new Map<string, number>();
    const catPlanned = new Map<string, number>();
    let activeDays = 0;

    const daily: DailyProgress[] = [];
    for (let d = startDate; d <= rangeEnd; d = addDays(d, 1)) {
      // Never opened that day → no assigned type either; guess the same way
      // the checklist itself would, purely to pick the right block set.
      const dayType = dayTypeByDate.get(d) ?? guessDayType(d);
      const dp = dayProgress(itemsByType[dayType], checksByDate.get(d) ?? new Map(), shiftByDate.get(d) ?? 0);
      daily.push({ date: d, dayType, plannedMin: dp.plannedMin, achievedMin: dp.achievedMin, loggedMin: dp.loggedMin, pct: dp.pct });

      if (dp.loggedMin > 0) {
        activeDays++;
        for (const p of dp.perItem) {
          const cat = p.item.category ?? "Uncategorized";
          if (p.plannedMin > 0) catPlanned.set(cat, (catPlanned.get(cat) ?? 0) + p.plannedMin);
          if (p.loggedMin > 0) catLogged.set(cat, (catLogged.get(cat) ?? 0) + p.loggedMin);
        }
      }
    }

    const started = daily.length;
    const onTargetDays = daily.filter((d) => d.plannedMin > 0 && d.pct >= STREAK_THRESHOLD).length;
    // The headline average only counts days that were actually logged —
    // averaging in days the app was never opened measures attendance, not
    // how well the plan was hit on the days it was followed.
    const avgActivePct = activeDays
      ? Math.round(daily.filter((d) => d.loggedMin > 0).reduce((s, d) => s + d.pct, 0) / activeDays)
      : 0;

    // Current streak: consecutive on-target days ending today — a day with
    // nothing logged (never opened) has pct 0 and breaks it, same as an
    // opened-but-short day.
    let streak = 0;
    for (let i = daily.length - 1; i >= 0; i--) {
      if (daily[i].plannedMin > 0 && daily[i].pct >= STREAK_THRESHOLD) streak++;
      else break;
    }

    const totalWindowDays = Math.round((new Date(`${endDate}T00:00:00`).getTime() - new Date(`${startDate}T00:00:00`).getTime()) / 86_400_000) + 1;
    const elapsedDays = Math.min(
      totalWindowDays,
      Math.round((new Date(`${today}T00:00:00`).getTime() - new Date(`${startDate}T00:00:00`).getTime()) / 86_400_000) + 1,
    );

    // "What actually happened instead" — a chronological record of every
    // block that got a note, newest first.
    const itemTitleById = new Map(items.map((i) => [i.id, i.title]));
    const notes: NoteEntry[] = checks
      .filter((c) => c.note)
      .map((c) => ({ date: c.date, itemTitle: itemTitleById.get(c.item_id) ?? "—", note: c.note as string }))
      .sort((a, b) => (a.date < b.date ? 1 : -1));

    const totalLogged = [...catLogged.values()].reduce((s, v) => s + v, 0) || 1;
    const categoryTotals: CategoryTotal[] = [...catLogged.entries()]
      .map(([category, minutes]) => ({
        category,
        minutes,
        avgPerDay: activeDays ? minutes / activeDays : 0,
        plannedAvgPerDay: activeDays ? (catPlanned.get(category) ?? 0) / activeDays : 0,
        pct: (minutes / totalLogged) * 100,
      }))
      .sort((a, b) => b.minutes - a.minutes);

    return {
      daily,
      notes,
      categoryTotals,
      started,
      activeDays,
      onTargetDays,
      avgActivePct,
      streak,
      totalWindowDays,
      elapsedDays: Math.max(0, elapsedDays),
    };
  }, [items, days, checks, startDate, rangeEnd, endDate, today]);

  return { ...data, endDate, loading, error, reload: load };
}
