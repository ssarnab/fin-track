import { duration } from "@/lib/time";
import type { RoutineItem, RoutineCheck } from "@/lib/types";

export type ItemProgress = {
  item: RoutineItem;
  plannedMin: number;
  actualMin: number; // capped at plannedMin — logging more time than planned doesn't over-achieve a block
  pct: number; // 0-100
  excluded: boolean;
};

/** How much of one block's planned duration was actually logged. An
 * unscheduled item (no start/end set yet) contributes nothing either way.
 * An excluded item (skipped for just this day) contributes nothing either —
 * it isn't "missed", it simply isn't part of the day at all. */
export function itemProgress(item: RoutineItem, check: RoutineCheck | undefined): ItemProgress {
  const excluded = check?.excluded ?? false;
  const plannedMin = !excluded && item.start_time && item.end_time ? duration(item.start_time, item.end_time) : 0;
  const rawActual =
    !excluded && check?.actual_start && check?.actual_end ? duration(check.actual_start, check.actual_end) : 0;
  const actualMin = Math.min(rawActual, plannedMin);
  const pct = plannedMin ? Math.round((actualMin / plannedMin) * 100) : 0;
  return { item, plannedMin, actualMin, pct, excluded };
}

export type DayProgress = {
  perItem: ItemProgress[];
  plannedMin: number;
  actualMin: number;
  pct: number; // time-weighted across every non-excluded block, not a flat item count
};

/** Whole-day completion, weighted by each block's planned duration — nine
 * hours of "Office" done right outweighs a missed ten-minute shower, the
 * way a flat per-item checklist never could. Excluded blocks don't figure
 * into the denominator, so skipping something today never drags the % down. */
export function dayProgress(items: RoutineItem[], checksByItemId: Map<number, RoutineCheck>): DayProgress {
  let plannedMin = 0;
  let actualMin = 0;
  const perItem = items.map((it) => {
    const p = itemProgress(it, checksByItemId.get(it.id));
    plannedMin += p.plannedMin;
    actualMin += p.actualMin;
    return p;
  });
  const pct = plannedMin ? Math.round((actualMin / plannedMin) * 100) : 0;
  return { perItem, plannedMin, actualMin, pct };
}
