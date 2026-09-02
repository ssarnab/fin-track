"use client";

import { useEffect, useMemo, useState } from "react";
import { useRoutineProgress } from "@/lib/useRoutineProgress";
import { addDays, todayISO } from "@/lib/date";
import { formatDuration } from "@/lib/time";
import { categoryColor } from "@/lib/routineCategory";
import { Card, Badge, Skeleton, Input, Field } from "@/components/ui";

const START_DATE_KEY = "fintrack:routine:startDate";

function StatBox({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-xl border border-border bg-surface-2/60 px-3 py-2.5">
      <p className="text-xs text-muted">{label}</p>
      <p className="mt-0.5 text-lg font-semibold tabular-nums text-fg">{value}</p>
      {hint && <p className="text-xs text-muted">{hint}</p>}
    </div>
  );
}

export default function RoutineProgress() {
  const [startDate, setStartDate] = useState(todayISO());

  useEffect(() => {
    try {
      const saved = localStorage.getItem(START_DATE_KEY);
      if (saved) setStartDate(saved);
    } catch {
      // ignore — falls back to today
    }
  }, []);

  function updateStartDate(v: string) {
    setStartDate(v);
    try {
      localStorage.setItem(START_DATE_KEY, v);
    } catch {
      // best-effort only
    }
  }

  const { daily, notes, categoryTotals, avgPct, streak, fullyDone, elapsedDays, totalWindowDays, endDate, loading, error } =
    useRoutineProgress(startDate, 4);

  const pctByDate = useMemo(() => new Map(daily.map((d) => [d.date, d.pct])), [daily]);
  const today = todayISO();

  const cells = useMemo(() => {
    const out: { date: string; pct: number; future: boolean }[] = [];
    for (let d = startDate; d <= endDate; d = addDays(d, 1)) {
      out.push({ date: d, pct: pctByDate.get(d) ?? 0, future: d > today });
    }
    return out;
  }, [startDate, endDate, today, pctByDate]);

  // A day with 0% is "missed" whether the app was opened and nothing was
  // checked, or never opened at all — no separate flag needed, both are
  // just an absence of done checks.
  function cellClass(c: (typeof cells)[number]) {
    if (c.future) return "bg-surface-2";
    if (c.pct === 100) return "bg-success";
    if (c.pct > 0) return "bg-primary/45";
    return "bg-danger/15";
  }

  return (
    <div className="space-y-4">
      <Card>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h3 className="font-semibold tracking-tight text-fg">4-month transformation</h3>
            <p className="text-sm text-muted">
              {startDate} → {endDate}
            </p>
          </div>
          <div className="w-40">
            <Field label="Start date">
              <Input type="date" value={startDate} onChange={(e) => updateStartDate(e.target.value)} />
            </Field>
          </div>
        </div>

        {loading ? (
          <Skeleton className="mt-4 h-20" />
        ) : error ? (
          <p className="mt-4 rounded-lg border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-danger">{error}</p>
        ) : (
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <StatBox label="Day" value={`${elapsedDays} / ${totalWindowDays}`} />
            <StatBox label="Average" value={`${avgPct}%`} hint="per opened day" />
            <StatBox label="Fully done" value={String(fullyDone)} hint="days at 100%" />
            <StatBox label="Current streak" value={`${streak}🔥`} hint="days in a row" />
          </div>
        )}
      </Card>

      {!loading && !error && (
        <Card>
          <h3 className="mb-3 font-semibold tracking-tight text-fg">Every day</h3>
          <div className="grid grid-cols-7 gap-1.5 sm:grid-cols-14">
            {cells.map((c) => (
              <div
                key={c.date}
                title={`${c.date}${c.future ? " (upcoming)" : ` — ${c.pct}%`}`}
                className={`aspect-square rounded-[4px] ${cellClass(c)} ${c.date === today ? "ring-2 ring-primary" : ""}`}
              />
            ))}
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-4 text-xs text-muted">
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-[3px] bg-success" /> Fully done
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-[3px] bg-primary/45" /> Partial
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-[3px] bg-danger/15" /> Missed
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-[3px] bg-surface-2" /> Upcoming
            </span>
          </div>
        </Card>
      )}

      {!loading && !error && categoryTotals.length > 0 && (
        <Card>
          <h3 className="mb-3 font-semibold tracking-tight text-fg">Time by category</h3>
          <p className="mb-3 text-xs text-muted">Hours actually logged so far, and each category&apos;s share of that time.</p>
          <div className="space-y-3">
            {categoryTotals.map((c) => (
              <div key={c.category}>
                <div className="flex items-baseline justify-between gap-3 text-sm">
                  <span className="flex items-center gap-1.5 text-fg">
                    <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: categoryColor(c.category) }} />
                    {c.category}
                  </span>
                  <span className="shrink-0 tabular-nums font-medium text-fg">
                    {formatDuration(c.minutes)} <span className="text-xs text-muted">({c.pct.toFixed(0)}%)</span>
                  </span>
                </div>
                <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-surface-2">
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${c.pct}%`, background: categoryColor(c.category) }}
                  />
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {!loading && !error && notes.length > 0 && (
        <Card>
          <h3 className="mb-3 font-semibold tracking-tight text-fg">What happened instead</h3>
          <div className="max-h-80 space-y-2 overflow-y-auto">
            {notes.map((n, i) => (
              <div key={i} className="rounded-lg border border-border bg-surface-2/60 px-3 py-2">
                <p className="flex items-baseline justify-between gap-3 text-xs text-muted">
                  <span className="font-medium text-fg">{n.itemTitle}</span>
                  <span className="shrink-0">{n.date}</span>
                </p>
                <p className="mt-0.5 text-sm text-fg">{n.note}</p>
              </div>
            ))}
          </div>
        </Card>
      )}

      {!loading && !error && streak === 0 && elapsedDays > 0 && (
        <Badge tone="danger" className="text-sm">
          No streak right now — open today&apos;s checklist and start ticking things off.
        </Badge>
      )}
    </div>
  );
}
