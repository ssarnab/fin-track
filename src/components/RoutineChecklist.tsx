"use client";

import { useState, type WheelEvent } from "react";
import { useRoutineDay } from "@/lib/useRoutineDay";
import { addDays, todayISO, formatDateLong } from "@/lib/date";
import { formatClock, formatDuration, formatShift, shiftTime } from "@/lib/time";
import type { ItemProgress } from "@/lib/routineCalc";
import { Card, Badge, Skeleton, Button, Input, Field } from "@/components/ui";
import type { DayType, RoutineCheck } from "@/lib/types";

const SHIFT_STEP = 15; // minutes per scroll tick / +- click

function pctTone(pct: number): "success" | "primary" | "danger" {
  if (pct >= 100) return "success";
  if (pct > 0) return "primary";
  return "danger";
}

/** Whole-day schedule offset — scroll (or click) to nudge every block's
 * planned time later/earlier without touching the template. */
function ShiftControl({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  function onWheel(e: WheelEvent) {
    e.preventDefault();
    onChange(value + (e.deltaY < 0 ? SHIFT_STEP : -SHIFT_STEP));
  }
  return (
    <div
      onWheel={onWheel}
      title="Scroll to shift today's schedule"
      className="flex items-center gap-1 rounded-lg border border-border bg-surface-2 p-1 text-xs"
    >
      <button
        onClick={() => onChange(value - SHIFT_STEP)}
        className="grid h-6 w-6 place-items-center rounded text-muted transition-colors hover:bg-surface hover:text-fg"
        aria-label="Shift earlier"
      >
        −
      </button>
      <span className={`min-w-24 select-none text-center font-medium tabular-nums ${value === 0 ? "text-muted" : "text-primary"}`}>
        {formatShift(value)}
      </span>
      <button
        onClick={() => onChange(value + SHIFT_STEP)}
        className="grid h-6 w-6 place-items-center rounded text-muted transition-colors hover:bg-surface hover:text-fg"
        aria-label="Shift later"
      >
        +
      </button>
      {value !== 0 && (
        <button onClick={() => onChange(0)} className="ml-0.5 px-1 text-muted hover:text-danger">
          reset
        </button>
      )}
    </div>
  );
}

function BlockRow({
  p,
  check,
  displayStart,
  displayEnd,
  onMarkPlanned,
  onLogActual,
  onClear,
  onSaveNote,
  onExclude,
  onInclude,
}: {
  p: ItemProgress;
  check: RoutineCheck | undefined;
  displayStart: string | null;
  displayEnd: string | null;
  onMarkPlanned: () => void;
  onLogActual: (start: string, end: string) => void;
  onClear: () => void;
  onSaveNote: (note: string) => void;
  onExclude: () => void;
  onInclude: () => void;
}) {
  const { item, plannedMin, actualMin, pct, excluded } = p;
  const hasLog = !!(check?.actual_start && check?.actual_end);
  const [editing, setEditing] = useState(false);
  const [start, setStart] = useState(check?.actual_start ?? displayStart ?? "");
  const [end, setEnd] = useState(check?.actual_end ?? displayEnd ?? "");

  if (excluded) {
    return (
      <div className="flex items-center justify-between gap-3 rounded-xl border border-dashed border-border bg-surface-2/40 px-3 py-2.5">
        <p className="truncate text-sm text-muted line-through">{item.title}</p>
        <button onClick={onInclude} className="shrink-0 text-xs text-primary hover:underline">
          Not skipped after all — add back
        </button>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-surface-2">
      <div className="flex flex-wrap items-center gap-3 px-3 py-2.5">
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm text-fg">{item.title}</p>
          {displayStart && displayEnd && (
            <p className="text-xs tabular-nums text-muted">
              {formatClock(displayStart)} – {formatClock(displayEnd)} · {formatDuration(plannedMin)}
            </p>
          )}
        </div>

        {hasLog && !editing && (
          <p className="shrink-0 text-xs tabular-nums text-muted">
            actual {formatClock(check!.actual_start!)}–{formatClock(check!.actual_end!)} ({formatDuration(actualMin)})
          </p>
        )}

        <Badge tone={pctTone(pct)} className="shrink-0">
          {pct}%
        </Badge>

        {!editing && (
          <div className="flex shrink-0 gap-1.5">
            {!hasLog && (
              <button
                onClick={onMarkPlanned}
                className="rounded-lg border border-success/40 bg-success/10 px-2.5 py-1 text-xs font-medium text-success transition-colors hover:bg-success/20"
              >
                ✓ As planned
              </button>
            )}
            <button
              onClick={() => setEditing(true)}
              className="rounded-lg border border-border bg-surface px-2.5 py-1 text-xs font-medium text-muted transition-colors hover:text-fg"
            >
              {hasLog ? "Edit" : "Log time"}
            </button>
            {hasLog && (
              <button
                onClick={onClear}
                className="rounded-lg border border-border bg-surface px-2.5 py-1 text-xs font-medium text-muted transition-colors hover:text-danger"
              >
                Clear
              </button>
            )}
            {!hasLog && (
              <button
                onClick={onExclude}
                title="Doesn't apply today — won't count toward the day's total"
                className="rounded-lg border border-border bg-surface px-2.5 py-1 text-xs font-medium text-muted transition-colors hover:text-danger"
              >
                Skip today
              </button>
            )}
          </div>
        )}
      </div>

      {editing && (
        <div className="flex flex-wrap items-end gap-2 border-t border-border/60 bg-surface px-3 py-3">
          <Field label="Actual start">
            <Input type="time" value={start} onChange={(e) => setStart(e.target.value)} className="w-32" />
          </Field>
          <Field label="Actual end">
            <Input type="time" value={end} onChange={(e) => setEnd(e.target.value)} className="w-32" />
          </Field>
          <Button
            className="px-3 py-2.5 text-sm"
            onClick={() => {
              if (start && end) onLogActual(start, end);
              setEditing(false);
            }}
          >
            Save
          </Button>
          <Button variant="ghost" className="px-3 py-2.5 text-sm" onClick={() => setEditing(false)}>
            Cancel
          </Button>
        </div>
      )}

      {pct < 100 && (
        <div className="border-t border-border/60 px-3 py-2">
          <input
            key={check?.note ?? ""}
            defaultValue={check?.note ?? ""}
            onBlur={(e) => e.target.value.trim() !== (check?.note ?? "") && onSaveNote(e.target.value)}
            placeholder="What happened instead? (optional)"
            className="w-full bg-transparent text-xs text-muted outline-none placeholder:text-muted/60 focus:text-fg"
          />
        </div>
      )}
    </div>
  );
}

export default function RoutineChecklist() {
  const [date, setDate] = useState(todayISO());
  const {
    dayType,
    shiftMinutes,
    perItem,
    checks,
    loading,
    error,
    markAsPlanned,
    logActual,
    clearActual,
    setNote,
    setExcluded,
    changeDayType,
    changeShift,
    plannedMin,
    actualMin,
    pct,
  } = useRoutineDay(date);

  return (
    <div className="space-y-4">
      <Card>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setDate((d) => addDays(d, -1))}
              className="grid h-8 w-8 place-items-center rounded-lg border border-border bg-surface-2 text-muted transition-colors hover:text-fg"
              aria-label="Previous day"
            >
              ‹
            </button>
            <div className="min-w-40 text-center">
              <p className="text-sm font-medium text-fg">{formatDateLong(date)}</p>
              {date !== todayISO() && (
                <button onClick={() => setDate(todayISO())} className="text-xs text-primary hover:underline">
                  Jump to today
                </button>
              )}
            </div>
            <button
              onClick={() => setDate((d) => addDays(d, 1))}
              className="grid h-8 w-8 place-items-center rounded-lg border border-border bg-surface-2 text-muted transition-colors hover:text-fg"
              aria-label="Next day"
            >
              ›
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {dayType && (
              <div className="flex gap-1 rounded-lg border border-border bg-surface-2 p-1 text-xs">
                {(["workday", "offday"] as DayType[]).map((dt) => (
                  <button
                    key={dt}
                    onClick={() => changeDayType(dt)}
                    className={`rounded-md px-2.5 py-1 font-medium transition-colors ${
                      dayType === dt ? "bg-primary text-primary-fg" : "text-muted hover:text-fg"
                    }`}
                  >
                    {dt === "workday" ? "Work day" : "Off day"}
                  </button>
                ))}
              </div>
            )}
            {!loading && <ShiftControl value={shiftMinutes} onChange={changeShift} />}
          </div>
        </div>

        {!loading && plannedMin > 0 && (
          <div className="mt-4 flex items-center gap-3">
            <div className="h-2 flex-1 overflow-hidden rounded-full bg-surface-2">
              <div
                className={`h-full rounded-full transition-all ${pct === 100 ? "bg-success" : "bg-primary"}`}
                style={{ width: `${pct}%` }}
              />
            </div>
            <Badge tone={pct === 100 ? "success" : "primary"}>
              {formatDuration(actualMin)} / {formatDuration(plannedMin)} · {pct}%
            </Badge>
          </div>
        )}
      </Card>

      {loading ? (
        <div className="space-y-2">
          {[0, 1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-14" />
          ))}
        </div>
      ) : error ? (
        <div className="rounded-xl border border-danger/40 bg-danger/10 px-4 py-3 text-danger">{error}</div>
      ) : perItem.length === 0 ? (
        <Card className="border-dashed p-10 text-center">
          <p className="text-fg">No checklist items for {dayType === "offday" ? "off days" : "work days"} yet.</p>
          <p className="mt-1 text-sm text-muted">Add some from the Templates tab.</p>
        </Card>
      ) : (
        <div className="space-y-2">
          {perItem.map((p) => (
            <BlockRow
              key={p.item.id}
              p={p}
              check={checks.get(p.item.id)}
              displayStart={p.item.start_time ? shiftTime(p.item.start_time, shiftMinutes) : null}
              displayEnd={p.item.end_time ? shiftTime(p.item.end_time, shiftMinutes) : null}
              onMarkPlanned={() => markAsPlanned(p.item)}
              onLogActual={(s, e) => logActual(p.item.id, s, e)}
              onClear={() => clearActual(p.item.id)}
              onSaveNote={(note) => setNote(p.item.id, note)}
              onExclude={() => setExcluded(p.item.id, true)}
              onInclude={() => setExcluded(p.item.id, false)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
