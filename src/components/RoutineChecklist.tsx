"use client";

import { useEffect, useState } from "react";
import { useRoutineDay } from "@/lib/useRoutineDay";
import { useDragList } from "@/lib/useDragList";
import { useLocalToggle } from "@/lib/useLocalToggle";
import { KEEP_TIMES_KEY } from "@/lib/routineCalc";
import { addDays, todayISO } from "@/lib/date";
import { duration, formatClock, formatDuration, overlapMinutes, shiftTime, signedOffset } from "@/lib/time";
import { categoryColor } from "@/lib/routineCategory";
import type { ItemProgress } from "@/lib/routineCalc";
import { Card, Skeleton, Button, Input, Textarea, Field, Modal, Grip, Checkbox } from "@/components/ui";
import ShiftSlider from "@/components/ShiftSlider";
import type { DayType, RoutineCheck } from "@/lib/types";

// A block is being nudged, not a whole day rescheduled: ±3h in 5-minute
// steps, because "ten minutes late" is a real answer and 15 would round it
// away.
const BLOCK_NUDGE_RANGE = 180;
const BLOCK_NUDGE_STEP = 5;

function pctColor(pct: number, excluded: boolean): string {
  if (excluded) return "text-muted";
  if (pct >= 90) return "text-success";
  if (pct > 0) return "text-primary";
  return "text-muted";
}

/** Whole-day achievement as a donut — the one number the day is judged on. */
function Ring({ pct }: { pct: number }) {
  const r = 15.5;
  const c = 2 * Math.PI * r;
  const stroke = pct >= 90 ? "var(--success)" : pct > 0 ? "var(--primary)" : "var(--border-strong)";
  return (
    <div className="relative h-10 w-10 shrink-0">
      <svg viewBox="0 0 36 36" className="h-10 w-10 -rotate-90">
        <circle cx="18" cy="18" r={r} fill="none" stroke="var(--surface-2)" strokeWidth="3.5" />
        <circle
          cx="18"
          cy="18"
          r={r}
          fill="none"
          stroke={stroke}
          strokeWidth="3.5"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - Math.min(100, pct) / 100)}
          className="transition-all duration-500"
        />
      </svg>
      <span className="absolute inset-0 grid place-items-center text-micro font-semibold tabular-nums text-fg">
        {pct}
      </span>
    </div>
  );
}

/** Everything you can record about one block, lifted out of the row and into
 * a dialog — the row itself stays a single scannable line. */
function BlockModal({
  p,
  check,
  onLogActual,
  onClear,
  onSaveNote,
  onExclude,
  onInclude,
  onClose,
}: {
  p: ItemProgress;
  check: RoutineCheck | undefined;
  onLogActual: (start: string, end: string) => void;
  onClear: () => void;
  onSaveNote: (note: string) => void;
  onExclude: () => void;
  onInclude: () => void;
  onClose: () => void;
}) {
  const { item, plannedStart, plannedEnd, plannedMin, excluded } = p;
  const [start, setStart] = useState(check?.actual_start ?? plannedStart ?? "");
  const [end, setEnd] = useState(check?.actual_end ?? plannedEnd ?? "");
  const [note, setNote] = useState(check?.note ?? "");
  const hasLog = !!(check?.actual_start && check?.actual_end);

  // Live read-out of what these times would actually score, so the
  // "overlap, not duration" rule is visible while you are typing them.
  const preview =
    start && end && plannedStart && plannedEnd ? overlapMinutes(plannedStart, plannedEnd, start, end) : null;
  const previewPct = preview !== null && plannedMin ? Math.round((preview / plannedMin) * 100) : 0;

  // How far the logged window sits from the planned one. Derived from the
  // fields rather than stored, so typing a time and dragging the slider stay
  // in agreement in both directions.
  const offset = plannedStart && start ? signedOffset(plannedStart, start) : 0;

  /** Slides the whole logged window against the plan, keeping its length —
   * "I did it, just forty minutes late" is one gesture, not two edits. */
  function nudge(minutes: number) {
    if (!plannedStart) return;
    const length = start && end ? duration(start, end) : plannedMin;
    const nextStart = shiftTime(plannedStart, minutes);
    setStart(nextStart);
    setEnd(shiftTime(nextStart, length));
  }

  function save() {
    if (start && end) onLogActual(start, end);
    if (note.trim() !== (check?.note ?? "")) onSaveNote(note);
    onClose();
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={item.title}
      subtitle={
        plannedStart && plannedEnd
          ? `Planned ${formatClock(plannedStart)} – ${formatClock(plannedEnd)} · ${formatDuration(plannedMin)}`
          : "No planned time yet — set one from the Templates tab"
      }
      footer={
        excluded ? (
          <Button
            pad="px-4 py-2"
            text="text-body"
            onClick={() => {
              onInclude();
              onClose();
            }}
          >
            Add back to today
          </Button>
        ) : (
          <>
            <button
              onClick={() => {
                onExclude();
                onClose();
              }}
              className="mr-auto text-meta text-muted transition-colors hover:text-danger"
            >
              Skip today
            </button>
            {hasLog && (
              <Button
                variant="ghost"
                pad="px-3 py-2"
                text="text-body"
                onClick={() => {
                  onClear();
                  onClose();
                }}
              >
                Clear log
              </Button>
            )}
            <Button pad="px-4 py-2" text="text-body" onClick={save}>
              Save
            </Button>
          </>
        )
      }
    >
      {excluded ? (
        <p className="text-body text-muted">Skipped for this day — it counts neither as planned time nor as missed.</p>
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Actual start">
              <Input type="time" value={start} onChange={(e) => setStart(e.target.value)} pad="px-3 py-2" />
            </Field>
            <Field label="Actual end">
              <Input type="time" value={end} onChange={(e) => setEnd(e.target.value)} pad="px-3 py-2" />
            </Field>
          </div>

          {plannedStart && plannedEnd && (
            <>
              <ShiftSlider
                fullWidth
                label="Shift"
                range={BLOCK_NUDGE_RANGE}
                step={BLOCK_NUDGE_STEP}
                value={offset}
                onChange={nudge}
                title="Slide the whole logged window earlier or later against the plan — its length stays the same"
              />

              <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border bg-surface-2/50 px-3 py-2">
                <button
                  onClick={() => {
                    setStart(plannedStart);
                    setEnd(plannedEnd);
                  }}
                  className="text-meta font-medium text-primary transition-opacity hover:opacity-80"
                >
                  Use the planned time
                </button>
                {preview !== null && (
                  <span className="text-meta tabular-nums text-muted">
                    <span className={previewPct >= 90 ? "font-semibold text-success" : "font-semibold text-fg"}>
                      {previewPct}%
                    </span>{" "}
                    · {formatDuration(preview)} of {formatDuration(plannedMin)} on plan
                  </span>
                )}
              </div>
            </>
          )}

          <Field label="What happened instead?">
            <Textarea
              rows={3}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Optional — why this block went the way it did."
              pad="px-3 py-2"
              className="text-body"
            />
          </Field>
        </div>
      )}
    </Modal>
  );
}

/** One block on the day's rail: time gutter, a status dot threaded onto the
 * timeline, the title, and what it scored. Everything else is one tap away
 * in the dialog, so the row never grows past a single line. */
function BlockRow({
  p,
  check,
  first,
  last,
  dropEdge,
  dimmed,
  onOpen,
  onToggle,
  gripProps,
  rowProps,
}: {
  p: ItemProgress;
  check: RoutineCheck | undefined;
  first: boolean;
  last: boolean;
  dropEdge: "top" | "bottom" | null;
  dimmed: boolean;
  onOpen: () => void;
  onToggle: () => void;
  gripProps: Record<string, unknown>;
  rowProps: Record<string, unknown>;
}) {
  const { item, plannedStart, plannedMin, loggedMin, pct, excluded } = p;
  const hasLog = !!(check?.actual_start && check?.actual_end);
  const color = item.category ? categoryColor(item.category) : "var(--border-strong)";

  return (
    <li
      {...rowProps}
      className={`group relative flex items-center rounded-lg transition-colors hover:bg-surface-2/60 ${
        dimmed ? "opacity-30" : ""
      } ${dropEdge === "top" ? "shadow-[inset_0_2px_0_0_var(--primary)]" : ""} ${
        dropEdge === "bottom" ? "shadow-[inset_0_-2px_0_0_var(--primary)]" : ""
      }`}
    >
      <span
        {...gripProps}
        aria-hidden
        title="Drag to reorder"
        className="grid h-8 w-4 shrink-0 cursor-grab place-items-center text-muted opacity-0 transition-opacity group-hover:opacity-40 hover:opacity-100 active:cursor-grabbing"
      >
        <Grip />
      </span>

      <span className="w-20 shrink-0 pr-2 text-right text-meta font-medium whitespace-nowrap tabular-nums text-muted">
        {plannedStart ? formatClock(plannedStart) : "—"}
      </span>

      {/* The rail — a hairline threading every block, stopped at both ends. */}
      {/* self-stretch, not a fixed height: the rail has to span whatever the
          row turns out to be, or the connecting line breaks between rows. */}
      <span className="relative flex w-6 shrink-0 items-center justify-center self-stretch">
        <span
          aria-hidden
          className={`absolute left-1/2 w-px -translate-x-1/2 bg-border ${first ? "top-1/2" : "top-0"} ${
            last ? "bottom-1/2" : "bottom-0"
          }`}
        />
        {/* The dot on the rail is the checkbox — one affordance, not two.
            Empty ring when nothing is logged, filled with a tick once it is,
            and the row reads as struck off. */}
        <button
          onClick={onToggle}
          role="checkbox"
          aria-checked={hasLog}
          aria-label={`${item.title} — done as planned`}
          title={hasLog ? "Clear this log" : "Done exactly as planned"}
          className="relative grid h-5 w-5 place-items-center rounded-full bg-surface"
        >
          <span
            className={`grid h-3.5 w-3.5 place-items-center rounded-full border-2 transition-all duration-150 group-hover:scale-110 ${
              excluded ? "opacity-40" : ""
            }`}
            style={{
              borderColor: color,
              background: hasLog ? color : "transparent",
              // The tick is always drawn and inherits this colour, so it
              // fades in with the fill instead of popping in.
              color: hasLog ? "var(--primary-fg)" : "transparent",
            }}
          >
            <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 6L9 17l-5-5" />
            </svg>
          </span>
        </button>
      </span>

      <button onClick={onOpen} className="flex min-w-0 flex-1 items-center gap-2 py-1.5 pr-2 text-left">
        <span
          className={`min-w-0 flex-1 truncate text-body transition-colors ${
            excluded
              ? "text-muted italic"
              : hasLog
                ? "text-muted line-through decoration-border-strong"
                : "text-fg"
          }`}
        >
          {item.title}
          {check?.note && (
            <span title={check.note} className="ml-1.5 align-middle text-micro text-muted">
              ✎
            </span>
          )}
        </span>

        <span className="hidden shrink-0 text-meta tabular-nums text-muted sm:block">
          {excluded
            ? "skipped"
            : hasLog
              ? `${formatClock(check!.actual_start!)}–${formatClock(check!.actual_end!)} · ${formatDuration(loggedMin)}`
              : formatDuration(plannedMin)}
        </span>

        <span className={`w-11 shrink-0 text-right text-meta font-semibold whitespace-nowrap tabular-nums ${pctColor(pct, excluded)}`}>
          {excluded ? "—" : `${pct}%`}
        </span>
      </button>
    </li>
  );
}

export default function RoutineChecklist() {
  const [date, setDate] = useState(todayISO());
  const [openId, setOpenId] = useState<number | null>(null);
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
    moveItem,
    plannedMin,
    achievedMin,
    pct,
  } = useRoutineDay(date);
  const [keepTimes, setKeepTimes] = useLocalToggle(KEEP_TIMES_KEY);
  const drag = useDragList((from, to) => moveItem(from, to, keepTimes));

  // The open block can vanish from under the dialog (day switched, template
  // edited in another tab) — close rather than leave a stale copy up.
  const open = perItem.find((p) => p.item.id === openId) ?? null;
  useEffect(() => {
    if (openId !== null && !loading && !open) setOpenId(null);
  }, [openId, loading, open]);

  const isToday = date === todayISO();
  const label = new Date(`${date}T00:00:00`).toLocaleDateString(undefined, {
    weekday: "short",
    day: "numeric",
    month: "short",
  });

  return (
    <div className="space-y-2.5">
      <Card pad="p-2.5" className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <div className="flex items-center gap-0.5">
          <button
            onClick={() => setDate((d) => addDays(d, -1))}
            className="grid h-7 w-6 place-items-center rounded-md text-muted transition-colors hover:bg-surface-2 hover:text-fg"
            aria-label="Previous day"
          >
            ‹
          </button>
          <button
            onClick={() => setDate(todayISO())}
            disabled={isToday}
            title={isToday ? undefined : "Jump to today"}
            className="min-w-28 rounded-md px-1.5 py-1 text-body font-semibold text-fg transition-colors hover:not-disabled:bg-surface-2 disabled:cursor-default"
          >
            {label}
            {!isToday && <span className="ml-1.5 text-micro font-medium text-primary">today ↩</span>}
          </button>
          <button
            onClick={() => setDate((d) => addDays(d, 1))}
            className="grid h-7 w-6 place-items-center rounded-md text-muted transition-colors hover:bg-surface-2 hover:text-fg"
            aria-label="Next day"
          >
            ›
          </button>
        </div>

        {dayType && (
          <div className="flex gap-0.5 rounded-lg bg-surface-2 p-0.5 text-meta">
            {(["workday", "offday"] as DayType[]).map((dt) => (
              <button
                key={dt}
                onClick={() => changeDayType(dt)}
                className={`rounded-md px-2.5 py-1 font-medium transition-colors ${
                  dayType === dt ? "bg-primary text-primary-fg" : "text-muted hover:text-fg"
                }`}
              >
                {dt === "workday" ? "Work" : "Off"}
              </button>
            ))}
          </div>
        )}

        {!loading && (
          <ShiftSlider
            label="Shift"
            value={shiftMinutes}
            onChange={changeShift}
            title="Move today's whole schedule earlier or later — arrow keys nudge 15m, double-click resets"
          />
        )}

        {!loading && perItem.length > 0 && (
          <Checkbox
            checked={keepTimes}
            onChange={setKeepTimes}
            label="Keep times"
            title="On: dragging changes only the order, and every block keeps the time it already has. Off: the day re-flows, so a moved block takes the time of where it lands."
          />
        )}

        {!loading && plannedMin > 0 && (
          <div className="ml-auto flex items-center gap-2">
            <div className="text-right leading-tight">
              <p className="text-body font-semibold tabular-nums text-fg">{formatDuration(achievedMin)}</p>
              <p className="text-micro text-muted">on plan of {formatDuration(plannedMin)}</p>
            </div>
            <Ring pct={pct} />
          </div>
        )}
      </Card>

      {loading ? (
        <Card pad="p-2" className="space-y-1">
          {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
            <Skeleton key={i} className="h-8" />
          ))}
        </Card>
      ) : error ? (
        <div className="rounded-xl border border-danger/40 bg-danger/10 px-4 py-3 text-body text-danger">{error}</div>
      ) : perItem.length === 0 ? (
        <Card pad="p-10" className="border-dashed text-center">
          <p className="text-fg">No blocks for {dayType === "offday" ? "off days" : "work days"} yet.</p>
          <p className="mt-1 text-body text-muted">Add some from the Templates tab.</p>
        </Card>
      ) : (
        <Card pad="p-1.5">
          <ul>
            {perItem.map((p, i) => (
              <BlockRow
                key={p.item.id}
                p={p}
                check={checks.get(p.item.id)}
                first={i === 0}
                last={i === perItem.length - 1}
                dimmed={drag.dragIndex === i}
                dropEdge={drag.dropEdge(i)}
                gripProps={drag.gripProps(i)}
                rowProps={drag.rowProps(i)}
                onOpen={() => setOpenId(p.item.id)}
                onToggle={() => (checks.get(p.item.id)?.actual_start ? clearActual(p.item.id) : markAsPlanned(p.item))}
              />
            ))}
          </ul>
        </Card>
      )}

      {open && (
        <BlockModal
          key={open.item.id}
          p={open}
          check={checks.get(open.item.id)}
          onLogActual={(s, e) => logActual(open.item.id, s, e)}
          onClear={() => clearActual(open.item.id)}
          onSaveNote={(note) => setNote(open.item.id, note)}
          onExclude={() => setExcluded(open.item.id, true)}
          onInclude={() => setExcluded(open.item.id, false)}
          onClose={() => setOpenId(null)}
        />
      )}
    </div>
  );
}
