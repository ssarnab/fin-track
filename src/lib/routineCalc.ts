import { duration, fromMinutes, overlapMinutes, shiftTime, toMinutes } from "@/lib/time";
import type { RoutineItem, RoutineCheck } from "@/lib/types";

export type ItemProgress = {
  item: RoutineItem;
  /** Today's planned window — the template time with the day's shift applied. */
  plannedStart: string | null;
  plannedEnd: string | null;
  plannedMin: number;
  /** Raw logged duration, uncapped — how long the thing actually took. Feeds
   * the "where did my hours go" rollups (sleep/day, office/day), never the %. */
  loggedMin: number;
  /** The slice of the logged time that fell inside the planned window. */
  achievedMin: number;
  pct: number; // achievedMin / plannedMin, 0-100
  excluded: boolean;
};

/** How much of one block's *plan* was actually hit. Achievement is the
 * overlap between planned and logged windows, not the logged length: going
 * to bed at 02:00 and waking at 08:00 is still six hours, but against a
 * 01:00→07:00 plan only five of them are on target. An unscheduled block
 * (no start/end yet) contributes nothing either way; an excluded one
 * (skipped for just this day) isn't "missed", it isn't part of the day. */
export function itemProgress(
  item: RoutineItem,
  check: RoutineCheck | undefined,
  shiftMinutes = 0,
): ItemProgress {
  const excluded = check?.excluded ?? false;
  const timed = !excluded && !!item.start_time && !!item.end_time;
  const plannedStart = timed ? shiftTime(item.start_time!, shiftMinutes) : null;
  const plannedEnd = timed ? shiftTime(item.end_time!, shiftMinutes) : null;
  const plannedMin = timed ? duration(item.start_time!, item.end_time!) : 0;

  const logged = !excluded && check?.actual_start && check?.actual_end
    ? { start: check.actual_start, end: check.actual_end }
    : null;
  const loggedMin = logged ? duration(logged.start, logged.end) : 0;
  const achievedMin =
    logged && plannedStart && plannedEnd
      ? overlapMinutes(plannedStart, plannedEnd, logged.start, logged.end)
      : 0;

  const pct = plannedMin ? Math.round((achievedMin / plannedMin) * 100) : 0;
  return { item, plannedStart, plannedEnd, plannedMin, loggedMin, achievedMin, pct, excluded };
}

export type DayProgress = {
  perItem: ItemProgress[];
  plannedMin: number;
  achievedMin: number;
  loggedMin: number;
  pct: number; // time-weighted across every non-excluded block, not a flat item count
};

/** Whole-day achievement, weighted by each block's planned duration — nine
 * hours of "Office" done on time outweighs a missed ten-minute shower, the
 * way a flat per-item checklist never could. Excluded blocks don't figure
 * into the denominator, so skipping something today never drags the % down. */
export function dayProgress(
  items: RoutineItem[],
  checksByItemId: Map<number, RoutineCheck>,
  shiftMinutes = 0,
): DayProgress {
  let plannedMin = 0;
  let achievedMin = 0;
  let loggedMin = 0;
  const perItem = items.map((it) => {
    const p = itemProgress(it, checksByItemId.get(it.id), shiftMinutes);
    plannedMin += p.plannedMin;
    achievedMin += p.achievedMin;
    loggedMin += p.loggedMin;
    return p;
  });
  const pct = plannedMin ? Math.round((achievedMin / plannedMin) * 100) : 0;
  return { perItem, plannedMin, achievedMin, loggedMin, pct };
}

/** Where the "keep times on reorder" preference is remembered. Shared by
 * the Today timeline and the Templates editor — it is one habit, not two. */
export const KEEP_TIMES_KEY = "fintrack:routine:keepTimes";

/** Re-lays a reordered day out end-to-end from `anchor`: every block keeps
 * its own duration and starts where the previous one finished. Dragging a
 * block therefore carries its length with it and closes the gap it left
 * behind — swapping two slots outright would hand a 7h sleep a 10m window.
 * Untimed blocks are left alone and don't move the cursor. */
export function reflowSchedule(ordered: RoutineItem[], anchor: string): RoutineItem[] {
  let cursor = toMinutes(anchor);
  return ordered.map((it) => {
    if (!it.start_time || !it.end_time) return it;
    const len = duration(it.start_time, it.end_time);
    const start = fromMinutes(cursor);
    cursor += len;
    return { ...it, start_time: start, end_time: fromMinutes(cursor) };
  });
}
