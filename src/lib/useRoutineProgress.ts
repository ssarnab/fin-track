"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { listRoutineItems, listRoutineDaysRange, listRoutineChecksRange, guessDayType } from "@/lib/routine";
import { dayProgress, itemProgress } from "@/lib/routineCalc";
import { useRealtime } from "@/lib/useRealtime";
import { addDays, addMonths, todayISO } from "@/lib/date";
import type { DayType, RoutineItem, RoutineDay, RoutineCheck } from "@/lib/types";

export type DailyProgress = { date: string; dayType: DayType; plannedMin: number; actualMin: number; pct: number };
export type NoteEntry = { date: string; itemTitle: string; note: string };
export type CategoryTotal = { category: string; minutes: number; pct: number };

// A day counts toward the streak / "fully done" tally at this % — a couple
// of minutes of timing slop shouldn't erase an otherwise on-target day, but
// this is still the time-weighted %, not a lenient item count.
const STREAK_THRESHOLD = 90;

/** Day-by-day (and overall) completion across the whole transformation
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
    const checksByDate = new Map<string, Map<number, RoutineCheck>>();
    for (const c of checks) {
      if (!checksByDate.has(c.date)) checksByDate.set(c.date, new Map());
      checksByDate.get(c.date)!.set(c.item_id, c);
    }

    const daily: DailyProgress[] = [];
    for (let d = startDate; d <= rangeEnd; d = addDays(d, 1)) {
      // Never opened that day → no assigned type either; guess the same way
      // the checklist itself would, purely to pick the right block set.
      const dayType = dayTypeByDate.get(d) ?? guessDayType(d);
      const dp = dayProgress(itemsByType[dayType], checksByDate.get(d) ?? new Map());
      daily.push({ date: d, dayType, plannedMin: dp.plannedMin, actualMin: dp.actualMin, pct: dp.pct });
    }

    const started = daily.length;
    const fullyDone = daily.filter((d) => d.plannedMin > 0 && d.pct >= STREAK_THRESHOLD).length;
    const avgPct = started ? Math.round(daily.reduce((s, d) => s + d.pct, 0) / started) : 0;

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

    // Hours actually logged per category, and each one's share of all
    // logged time — "Work 300h", "Sleep 30%", etc.
    const itemById = new Map(items.map((i) => [i.id, i]));
    const categoryMin = new Map<string, number>();
    for (const c of checks) {
      const item = itemById.get(c.item_id);
      if (!item) continue;
      const { actualMin } = itemProgress(item, c);
      if (actualMin <= 0) continue;
      const cat = item.category ?? "Uncategorized";
      categoryMin.set(cat, (categoryMin.get(cat) ?? 0) + actualMin);
    }
    const totalCategoryMin = [...categoryMin.values()].reduce((s, v) => s + v, 0) || 1;
    const categoryTotals: CategoryTotal[] = [...categoryMin.entries()]
      .map(([category, minutes]) => ({ category, minutes, pct: (minutes / totalCategoryMin) * 100 }))
      .sort((a, b) => b.minutes - a.minutes);

    return { daily, notes, categoryTotals, started, fullyDone, avgPct, streak, totalWindowDays, elapsedDays: Math.max(0, elapsedDays) };
  }, [items, days, checks, startDate, rangeEnd, endDate, today]);

  return { ...data, endDate, loading, error, reload: load };
}
