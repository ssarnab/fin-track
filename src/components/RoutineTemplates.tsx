"use client";

import { useCallback, useEffect, useState } from "react";
import {
  listRoutineItems,
  createRoutineItem,
  updateRoutineItem,
  deleteRoutineItem,
  resetRoutineTemplate,
} from "@/lib/routine";
import { duration, formatDuration } from "@/lib/time";
import { useRealtime } from "@/lib/useRealtime";
import { Card, Input, Button, Badge, Skeleton, Field } from "@/components/ui";
import CategoryPicker from "@/components/CategoryPicker";
import type { DayType, RoutineItem } from "@/lib/types";

function ItemCard({
  item,
  busy,
  onSave,
  onRemove,
}: {
  item: RoutineItem;
  busy: boolean;
  onSave: (patch: Partial<Pick<RoutineItem, "title" | "start_time" | "end_time" | "category">>) => void;
  onRemove: () => void;
}) {
  return (
    <Card className={`p-4 transition-opacity ${busy ? "opacity-60" : ""}`}>
      <div className="flex items-start gap-3">
        <div className="flex-1">
          <Field label="Block">
            <Input
              defaultValue={item.title}
              onBlur={(e) => e.target.value.trim() && e.target.value !== item.title && onSave({ title: e.target.value.trim() })}
              placeholder="Block title"
            />
          </Field>
        </div>
        <button
          onClick={onRemove}
          title="Remove block"
          className="mt-6 grid h-9 w-9 shrink-0 place-items-center rounded-lg text-muted transition-colors hover:bg-danger/10 hover:text-danger"
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m2 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
          </svg>
        </button>
      </div>

      <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Field label="Category">
          <CategoryPicker value={item.category} onChange={(v) => onSave({ category: v })} />
        </Field>
        <Field label="Start">
          <Input
            type="time"
            defaultValue={item.start_time ?? ""}
            onBlur={(e) => e.target.value !== (item.start_time ?? "") && onSave({ start_time: e.target.value || null })}
          />
        </Field>
        <Field label="End">
          <Input
            type="time"
            defaultValue={item.end_time ?? ""}
            onBlur={(e) => e.target.value !== (item.end_time ?? "") && onSave({ end_time: e.target.value || null })}
          />
        </Field>
      </div>
    </Card>
  );
}

export default function RoutineTemplates() {
  const [dayType, setDayType] = useState<DayType>("workday");
  const [items, setItems] = useState<RoutineItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [resetting, setResetting] = useState(false);

  const load = useCallback(async () => {
    try {
      setItems(await listRoutineItems(dayType));
    } finally {
      setLoading(false);
    }
  }, [dayType]);

  useEffect(() => {
    setLoading(true);
    load();
  }, [load]);
  useRealtime(["routine_item"], load);

  const totalPlanned = items.reduce((s, it) => s + (it.start_time && it.end_time ? duration(it.start_time, it.end_time) : 0), 0);

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
    if (!window.confirm(`Replace every ${dayType === "workday" ? "work day" : "off day"} block with the suggested 24h plan? This deletes the current ones (and their history).`)) return;
    setResetting(true);
    try {
      await resetRoutineTemplate(dayType);
      await load();
    } finally {
      setResetting(false);
    }
  }

  return (
    <div className="space-y-4">
      <Card>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex gap-1 rounded-lg border border-border bg-surface-2 p-1 text-sm">
            {(["workday", "offday"] as DayType[]).map((dt) => (
              <button
                key={dt}
                onClick={() => setDayType(dt)}
                className={`rounded-md px-3 py-1.5 font-medium transition-colors ${
                  dayType === dt ? "bg-primary text-primary-fg" : "text-muted hover:text-fg"
                }`}
              >
                {dt === "workday" ? "Work day" : "Off day"}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <Button variant="surface" onClick={resetToPlan} disabled={resetting}>
              {resetting ? "Resetting…" : "Reset to suggested plan"}
            </Button>
            <Button variant="surface" onClick={addItem}>
              + Add block
            </Button>
          </div>
        </div>
        {!loading && (
          <p className="mt-3 text-xs text-muted">
            <Badge tone={totalPlanned === 1440 ? "success" : "warning"}>{formatDuration(totalPlanned)} of 24h planned</Badge>
            {totalPlanned !== 1440 && " — set start/end for every block so the day adds up cleanly."}
          </p>
        )}
      </Card>

      {loading ? (
        <div className="space-y-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <Card className="border-dashed p-10 text-center">
          <p className="text-fg">No blocks yet for {dayType === "offday" ? "off days" : "work days"}.</p>
          <p className="mt-1 text-sm text-muted">Click &quot;Reset to suggested plan&quot; for a ready-made 24h day, or add blocks by hand.</p>
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {items.map((it) => (
            <ItemCard
              key={it.id}
              item={it}
              busy={busyId === it.id}
              onSave={(patch) => saveItem(it.id, patch)}
              onRemove={() => removeItem(it.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
