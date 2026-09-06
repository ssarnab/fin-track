"use client";

import { useCallback, useEffect, useState } from "react";
import {
  listRoutineItems,
  createRoutineItem,
  updateRoutineItem,
  deleteRoutineItem,
  resetRoutineTemplate,
  saveRoutineItemOrder,
} from "@/lib/routine";
import { reflowSchedule, KEEP_TIMES_KEY } from "@/lib/routineCalc";
import { useDragList } from "@/lib/useDragList";
import { useLocalToggle } from "@/lib/useLocalToggle";
import { duration, formatClock, formatDuration, shiftTime } from "@/lib/time";
import { categoryColor } from "@/lib/routineCategory";
import { useRealtime } from "@/lib/useRealtime";
import { Card, Input, Button, Badge, Skeleton, Grip, Checkbox } from "@/components/ui";
import ShiftSlider from "@/components/ShiftSlider";
import CategoryPicker from "@/components/CategoryPicker";
import type { DayType, RoutineItem } from "@/lib/types";

/** One template block as a single dense line — the fields are borderless
 * until you reach for them, so fourteen of them read as a schedule rather
 * than as fourteen forms. */
function ItemRow({
  item,
  busy,
  first,
  last,
  dimmed,
  dropEdge,
  onSave,
  onRemove,
  gripProps,
  rowProps,
}: {
  item: RoutineItem;
  busy: boolean;
  first: boolean;
  last: boolean;
  dimmed: boolean;
  dropEdge: "top" | "bottom" | null;
  onSave: (patch: Partial<Pick<RoutineItem, "title" | "start_time" | "end_time" | "category">>) => void;
  onRemove: () => void;
  gripProps: Record<string, unknown>;
  rowProps: Record<string, unknown>;
}) {
  const len = item.start_time && item.end_time ? duration(item.start_time, item.end_time) : 0;
  const color = item.category ? categoryColor(item.category) : "var(--border-strong)";

  return (
    <li
      {...rowProps}
      className={`group relative flex items-center gap-1 rounded-lg transition-colors hover:bg-surface-2/60 ${
        busy ? "opacity-60" : ""
      } ${dimmed ? "opacity-30" : ""} ${dropEdge === "top" ? "shadow-[inset_0_2px_0_0_var(--primary)]" : ""} ${
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

      {/* The same rail as the Today timeline, so both tabs read alike. */}
      <span className="relative flex w-5 shrink-0 items-center justify-center self-stretch">
        <span
          aria-hidden
          className={`absolute left-1/2 w-px -translate-x-1/2 bg-border ${first ? "top-1/2" : "top-0"} ${
            last ? "bottom-1/2" : "bottom-0"
          }`}
        />
        <span className="relative h-2.5 w-2.5 rounded-full border-2" style={{ borderColor: color }} />
      </span>

      <Input
        defaultValue={item.title}
        onBlur={(e) => e.target.value.trim() && e.target.value !== item.title && onSave({ title: e.target.value.trim() })}
        placeholder="Block title"
        pad="px-1.5 py-1"
        radius="rounded-md"
        ring="focus:ring-2 focus:ring-ring"
        width="min-w-32 flex-1"
        className="border-transparent bg-transparent hover:border-border focus:bg-surface-2"
      />

      <div className="w-28 shrink-0">
        <CategoryPicker compact value={item.category} onChange={(v) => onSave({ category: v })} />
      </div>

      <Input
        type="time"
        defaultValue={item.start_time ?? ""}
        onBlur={(e) => e.target.value !== (item.start_time ?? "") && onSave({ start_time: e.target.value || null })}
        aria-label="Start"
        pad="px-1.5 py-1"
        radius="rounded-md"
        ring="focus:ring-2 focus:ring-ring"
        width="w-26 shrink-0"
        text="text-meta"
        className="border-transparent bg-transparent tabular-nums hover:border-border focus:bg-surface-2"
      />
      <Input
        type="time"
        defaultValue={item.end_time ?? ""}
        onBlur={(e) => e.target.value !== (item.end_time ?? "") && onSave({ end_time: e.target.value || null })}
        aria-label="End"
        pad="px-1.5 py-1"
        radius="rounded-md"
        ring="focus:ring-2 focus:ring-ring"
        width="w-26 shrink-0"
        text="text-meta"
        className="border-transparent bg-transparent tabular-nums hover:border-border focus:bg-surface-2"
      />

      <span className="w-12 shrink-0 text-right text-meta whitespace-nowrap tabular-nums text-muted">
        {len ? formatDuration(len) : "—"}
      </span>

      <button
        onClick={onRemove}
        title="Remove block"
        className="mr-0.5 ml-1 grid h-6 w-6 shrink-0 place-items-center rounded-md text-muted opacity-0 transition-all group-hover:opacity-100 hover:bg-danger/10 hover:text-danger"
      >
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m2 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
        </svg>
      </button>
    </li>
  );
}

export default function RoutineTemplates() {
  const [dayType, setDayType] = useState<DayType>("workday");
  const [items, setItems] = useState<RoutineItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [resetting, setResetting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // A pending, not-yet-written offset for the whole template. Unlike the
  // Today slider (which stores an offset for one date), this one rewrites
  // every block's time — so it previews first and only commits on Apply.
  const [pendingShift, setPendingShift] = useState(0);
  const [keepTimes, setKeepTimes] = useLocalToggle(KEEP_TIMES_KEY);

  const load = useCallback(async () => {
    try {
      setItems(await listRoutineItems(dayType));
    } finally {
      setLoading(false);
    }
  }, [dayType]);

  useEffect(() => {
    setLoading(true);
    setPendingShift(0);
    load();
  }, [load]);
  useRealtime(["routine_item"], load);

  // What the list looks like with the pending offset applied — the rows are
  // rendered from this, so the slider previews the whole day at once.
  const shown = pendingShift
    ? items.map((it) => ({
        ...it,
        start_time: it.start_time ? shiftTime(it.start_time, pendingShift) : null,
        end_time: it.end_time ? shiftTime(it.end_time, pendingShift) : null,
      }))
    : items;

  const totalPlanned = items.reduce(
    (s, it) => s + (it.start_time && it.end_time ? duration(it.start_time, it.end_time) : 0),
    0,
  );
  const dayStart = shown.find((it) => it.start_time)?.start_time ?? null;

  /** Writes a whole rewritten list, then resyncs. The realtime subscription
   * fires on the first row to land and would otherwise repaint the list from
   * a half-written server state, so the reload at the end is what makes the
   * view trustworthy — and a failure has to be visible, not swallowed. */
  async function saveAll(next: RoutineItem[]) {
    setItems(next); // optimistic
    setPendingShift(0);
    setError(null);
    try {
      await saveRoutineItemOrder(next);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save the new schedule");
    } finally {
      await load();
    }
  }

  const applyShift = () => saveAll(shown);

  /** Same two modes as the Today timeline. Re-flow: the moved block keeps
   * its own length and slots in after the previous one, and everything it
   * displaced closes up behind it, so the template still adds up to a full
   * day. Keep-times: only the order moves, every block holds its own hours. */
  function moveItem(from: number, to: number) {
    if (from === to) return;
    const anchor = shown.find((it) => it.start_time)?.start_time ?? "00:00";
    const next = [...shown];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    // Either path bakes any previewed shift into the times it writes.
    const ordered = keepTimes ? next : reflowSchedule(next, anchor);
    saveAll(ordered.map((it, i) => ({ ...it, sort_order: i })));
  }

  const drag = useDragList(moveItem);

  async function addItem() {
    const created = await createRoutineItem(dayType, "New block", null, null, items.length);
    setItems((prev) => [...prev, created]);
  }

  async function saveItem(id: number, patch: Partial<Pick<RoutineItem, "title" | "start_time" | "end_time" | "category">>) {
    setBusyId(id);
    try {
      await updateRoutineItem(id, patch);
      setItems((prev) => prev.map((it) => (it.id === id ? { ...it, ...patch } : it)));
    } finally {
      setBusyId(null);
    }
  }

  async function removeItem(id: number) {
    if (!window.confirm("Remove this block? Past check-ins for it go too.")) return;
    setItems((prev) => prev.filter((it) => it.id !== id));
    await deleteRoutineItem(id);
  }

  async function resetToPlan() {
    if (
      !window.confirm(
        `Replace every ${dayType === "workday" ? "work day" : "off day"} block with the suggested 24h plan? This deletes the current ones (and their history).`,
      )
    )
      return;
    setResetting(true);
    try {
      await resetRoutineTemplate(dayType);
      setPendingShift(0);
      await load();
    } finally {
      setResetting(false);
    }
  }

  return (
    <div className="space-y-2.5">
      <Card pad="p-2.5" className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <div className="flex gap-0.5 rounded-lg bg-surface-2 p-0.5 text-meta">
          {(["workday", "offday"] as DayType[]).map((dt) => (
            <button
              key={dt}
              onClick={() => setDayType(dt)}
              className={`rounded-md px-2.5 py-1 font-medium transition-colors ${
                dayType === dt ? "bg-primary text-primary-fg" : "text-muted hover:text-fg"
              }`}
            >
              {dt === "workday" ? "Work" : "Off"}
            </button>
          ))}
        </div>

        {!loading && items.length > 0 && (
          <div className="flex items-center gap-2">
            <ShiftSlider
              label="Shift all"
              value={pendingShift}
              onChange={setPendingShift}
              title="Preview the whole template moved earlier or later — Apply to save"
            />
            {pendingShift !== 0 && (
              <Button pad="px-2.5 py-1" text="text-meta" onClick={applyShift}>
                Apply{dayStart ? ` · day starts ${formatClock(dayStart)}` : ""}
              </Button>
            )}
            <Checkbox
              checked={keepTimes}
              onChange={setKeepTimes}
              label="Keep times"
              title="On: dragging changes only the order, and every block keeps the time it already has. Off: the day re-flows, so a moved block takes the time of where it lands."
            />
          </div>
        )}

        <div className="ml-auto flex items-center gap-2">
          {!loading && (
            <Badge tone={totalPlanned === 1440 ? "success" : "warning"}>{formatDuration(totalPlanned)} / 24h</Badge>
          )}
          <Button variant="ghost" pad="px-2.5 py-1.5" text="text-meta" onClick={resetToPlan} disabled={resetting}>
            {resetting ? "Resetting…" : "Reset to plan"}
          </Button>
          <Button variant="surface" pad="px-2.5 py-1.5" text="text-meta" onClick={addItem}>
            + Add block
          </Button>
        </div>

        {error ? (
          <p className="w-full rounded-lg border border-danger/40 bg-danger/10 px-2.5 py-1.5 text-meta text-danger">
            {error}
          </p>
        ) : (
          !loading &&
          totalPlanned !== 1440 && (
            <p className="w-full text-meta text-muted">
              Give every block a start and end so the day adds up to 24h — the achievement % is weighted by planned
              time.
            </p>
          )
        )}
      </Card>

      {loading ? (
        <Card pad="p-2" className="space-y-1">
          {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
            <Skeleton key={i} className="h-8" />
          ))}
        </Card>
      ) : items.length === 0 ? (
        <Card pad="p-10" className="border-dashed text-center">
          <p className="text-fg">No blocks yet for {dayType === "offday" ? "off days" : "work days"}.</p>
          <p className="mt-1 text-body text-muted">
            Click &quot;Reset to plan&quot; for a ready-made 24h day, or add blocks by hand.
          </p>
        </Card>
      ) : (
        <Card pad="p-1.5">
          <ul>
            {shown.map((it, i) => (
              // The fields inside are uncontrolled (defaultValue), so React
              // would keep showing the old times after a drag re-flowed them
              // or the slider previewed a shift. Keying on the times forces
              // the row to remount whenever they actually change.
              <ItemRow
                key={`${it.id}:${it.start_time ?? ""}:${it.end_time ?? ""}`}
                item={it}
                busy={busyId === it.id}
                first={i === 0}
                last={i === shown.length - 1}
                dimmed={drag.dragIndex === i}
                dropEdge={drag.dropEdge(i)}
                gripProps={drag.gripProps(i)}
                rowProps={drag.rowProps(i)}
                onSave={(patch) => saveItem(it.id, patch)}
                onRemove={() => removeItem(it.id)}
              />
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}
