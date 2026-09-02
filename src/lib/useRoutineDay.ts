"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  getOrCreateRoutineDay,
  listRoutineItems,
  listRoutineChecks,
  setRoutineCheckActual,
  clearRoutineCheckActual,
  setRoutineCheckNote,
  setRoutineCheckExcluded,
  setRoutineDayType,
  setRoutineDayShift,
} from "@/lib/routine";
import { dayProgress } from "@/lib/routineCalc";
import { shiftTime } from "@/lib/time";
import { useRealtime } from "@/lib/useRealtime";
import type { DayType, RoutineItem, RoutineCheck } from "@/lib/types";

/** The full time-block state for one calendar date — its day-type, any
 * whole-day schedule shift, that type's planned blocks, and what was
 * actually logged (+ note) for each. */
export function useRoutineDay(date: string) {
  const [dayType, setDayType] = useState<DayType | null>(null);
  const [shiftMinutes, setShiftMinutes] = useState(0);
  const [items, setItems] = useState<RoutineItem[]>([]);
  const [checks, setChecks] = useState<Map<number, RoutineCheck>>(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { dayType: dt, shiftMinutes: shift } = await getOrCreateRoutineDay(date);
      const [its, chks] = await Promise.all([listRoutineItems(dt), listRoutineChecks(date)]);
      setDayType(dt);
      setShiftMinutes(shift);
      setItems(its);
      setChecks(new Map(chks.map((c) => [c.item_id, c])));
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load routine");
    } finally {
      setLoading(false);
    }
  }, [date]);

  useEffect(() => {
    load();
  }, [load]);
  useRealtime(["routine_item", "routine_day", "routine_check"], load);

  const logActual = useCallback(
    async (itemId: number, actualStart: string, actualEnd: string) => {
      setChecks((m) => {
        const next = new Map(m);
        next.set(itemId, { ...(next.get(itemId) as RoutineCheck), item_id: itemId, actual_start: actualStart, actual_end: actualEnd });
        return next;
      }); // optimistic
      await setRoutineCheckActual(date, itemId, actualStart, actualEnd);
    },
    [date],
  );

  const clearActual = useCallback(
    async (itemId: number) => {
      setChecks((m) => {
        const next = new Map(m);
        const prev = next.get(itemId);
        if (prev) next.set(itemId, { ...prev, actual_start: null, actual_end: null });
        return next;
      }); // optimistic
      await clearRoutineCheckActual(date, itemId);
    },
    [date],
  );

  /** One-click "did exactly what was planned" — fills actual = today's
   * (possibly shifted) planned time, not the raw unshifted template time. */
  const markAsPlanned = useCallback(
    (item: RoutineItem) => {
      if (!item.start_time || !item.end_time) return;
      return logActual(item.id, shiftTime(item.start_time, shiftMinutes), shiftTime(item.end_time, shiftMinutes));
    },
    [logActual, shiftMinutes],
  );

  const setNote = useCallback(
    async (itemId: number, note: string) => {
      setChecks((m) => {
        const next = new Map(m);
        const prev = next.get(itemId);
        next.set(itemId, { ...(prev as RoutineCheck), item_id: itemId, note: note.trim() || null });
        return next;
      }); // optimistic
      await setRoutineCheckNote(date, itemId, note);
    },
    [date],
  );

  const setExcluded = useCallback(
    async (itemId: number, excluded: boolean) => {
      setChecks((m) => {
        const next = new Map(m);
        const prev = next.get(itemId);
        next.set(itemId, { ...(prev as RoutineCheck), item_id: itemId, excluded });
        return next;
      }); // optimistic
      await setRoutineCheckExcluded(date, itemId, excluded);
    },
    [date],
  );

  const changeDayType = useCallback(
    async (dt: DayType) => {
      await setRoutineDayType(date, dt);
      await load();
    },
    [date, load],
  );

  // A wheel gesture fires this dozens of times a second — writing to the
  // server on every tick let concurrent upserts for the same (new) row race
  // each other (one arriving without day_type, since only the row's own
  // getOrCreateRoutineDay call carries it, PGRST 23502). Update the UI
  // instantly but only persist once scrolling/clicking settles.
  const shiftTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => {
    if (shiftTimer.current) clearTimeout(shiftTimer.current);
  }, []);
  const changeShift = useCallback(
    (minutes: number) => {
      setShiftMinutes(minutes); // optimistic, instant
      if (shiftTimer.current) clearTimeout(shiftTimer.current);
      shiftTimer.current = setTimeout(() => {
        setRoutineDayShift(date, minutes).catch((e) => {
          setError(e instanceof Error ? e.message : "Failed to save shift");
        });
      }, 500);
    },
    [date],
  );

  const progress = dayProgress(items, checks);

  return {
    dayType,
    shiftMinutes,
    items,
    checks,
    loading,
    error,
    logActual,
    clearActual,
    markAsPlanned,
    setNote,
    setExcluded,
    changeDayType,
    changeShift,
    reload: load,
    ...progress,
  };
}
