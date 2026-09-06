"use client";

import { useEffect, useMemo, useState } from "react";
import { useRoutineProgress } from "@/lib/useRoutineProgress";
import { addDays, todayISO } from "@/lib/date";
import { formatDuration } from "@/lib/time";
import { categoryColor } from "@/lib/routineCategory";
import { Panel, Stat, MeterRow, Skeleton, Input, ErrorNote } from "@/components/ui";

const START_DATE_KEY = "fintrack:routine:startDate";

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

  const {
    daily,
    notes,
    categoryTotals,
    avgActivePct,
    activeDays,
    onTargetDays,
    streak,
    elapsedDays,
    totalWindowDays,
    endDate,
    loading,
    error,
  } = useRoutineProgress(startDate, 4);

  const pctByDate = useMemo(() => new Map(daily.map((d) => [d.date, d.pct])), [daily]);
  const today = todayISO();

  const cells = useMemo(() => {
    const out: { date: string; pct: number; future: boolean }[] = [];
    for (let d = startDate; d <= endDate; d = addDays(d, 1)) {
      out.push({ date: d, pct: pctByDate.get(d) ?? 0, future: d > today });
    }
    return out;
  }, [startDate, endDate, today, pctByDate]);

  // A day at 0% is "missed" whether the app was opened and nothing logged or
  // never opened at all — both are just an absence of time spent on plan.
  function cellClass(c: (typeof cells)[number]) {
    if (c.future) return "bg-surface-2";
    if (c.pct >= 90) return "bg-success";
    if (c.pct >= 50) return "bg-primary/60";
    if (c.pct > 0) return "bg-primary/25";
    return "bg-danger/15";
  }

  const windowPct = totalWindowDays ? Math.round((elapsedDays / totalWindowDays) * 100) : 0;

  if (loading) {
    return (
      <div className="space-y-2.5">
        <Skeleton className="h-24" />
        <Skeleton className="h-32" />
        <Skeleton className="h-48" />
      </div>
    );
  }
  if (error) return <ErrorNote>{error}</ErrorNote>;

  return (
    <div className="space-y-2.5">
      <Panel
        title="4-month transformation"
        subtitle={`${startDate} → ${endDate} · day ${elapsedDays} of ${totalWindowDays}`}
        actions={
          <Input
            type="date"
            value={startDate}
            onChange={(e) => updateStartDate(e.target.value)}
            pad="px-2 py-1"
            radius="rounded-lg"
            ring="focus:ring-2 focus:ring-ring"
            width="w-32"
            text="text-meta"
            className="tabular-nums"
          />
        }
        bodyPad="p-3"
      >
        <div className="mb-3 h-1 overflow-hidden rounded-full bg-surface-2">
          <div className="h-full rounded-full bg-primary transition-[width] duration-500" style={{ width: `${windowPct}%` }} />
        </div>
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
          <Stat
            label="Target hit"
            value={`${avgActivePct}%`}
            tone={avgActivePct >= 90 ? "success" : "primary"}
            hint="avg per logged day"
          />
          <Stat label="On target" value={onTargetDays} hint="days at 90%+" />
          <Stat label="Logged" value={activeDays} hint={`of ${elapsedDays} elapsed`} />
          <Stat label="Streak" value={`${streak}🔥`} hint="days in a row" />
        </div>
      </Panel>

      <Panel title="Every day" subtitle="How much of each day's plan was hit at the time it was planned for">
        <div className="grid grid-cols-14 gap-1 sm:grid-cols-28">
          {cells.map((c) => (
            <div
              key={c.date}
              title={`${c.date}${c.future ? " (upcoming)" : ` — ${c.pct}%`}`}
              className={`aspect-square rounded-sm ${cellClass(c)} ${
                c.date === today ? "ring-2 ring-primary ring-offset-1 ring-offset-surface" : ""
              }`}
            />
          ))}
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-3 text-micro text-muted">
          <span className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-xs bg-success" /> 90%+
          </span>
          <span className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-xs bg-primary/60" /> 50%+
          </span>
          <span className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-xs bg-primary/25" /> Partial
          </span>
          <span className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-xs bg-danger/15" /> Missed
          </span>
          <span className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-xs bg-surface-2" /> Upcoming
          </span>
        </div>
      </Panel>

      {categoryTotals.length > 0 && (
        <Panel
          title="Where the hours went"
          subtitle="Time actually logged, whether or not it landed on plan"
        >
          <div className="space-y-2.5">
            {categoryTotals.map((c) => {
              const diff = c.avgPerDay - c.plannedAvgPerDay;
              const off = Math.abs(diff) >= 10; // under ten minutes a day is noise
              return (
                <MeterRow
                  key={c.category}
                  label={
                    <span className="flex items-center gap-1.5">
                      <span
                        className="h-1.5 w-1.5 shrink-0 rounded-full"
                        style={{ background: categoryColor(c.category) }}
                      />
                      {c.category}
                    </span>
                  }
                  value={
                    <>
                      {formatDuration(Math.round(c.avgPerDay))}
                      <span className="text-meta font-normal text-muted">/day</span>
                      {off && (
                        <span className={`ml-1.5 text-meta font-normal ${diff > 0 ? "text-warning" : "text-muted"}`}>
                          {diff > 0 ? "+" : "−"}
                          {formatDuration(Math.round(Math.abs(diff)))}
                        </span>
                      )}
                    </>
                  }
                  pct={c.pct}
                  color={categoryColor(c.category)}
                  note={`${formatDuration(c.minutes)} total · ${c.pct.toFixed(0)}% of logged time · plan ${formatDuration(Math.round(c.plannedAvgPerDay))}/day`}
                />
              );
            })}
          </div>
        </Panel>
      )}

      {notes.length > 0 && (
        <Panel title="What happened instead" subtitle={`${notes.length} notes`} bodyPad="p-1.5">
          <ul className="max-h-80 overflow-y-auto">
            {notes.map((n, i) => (
              <li key={i} className="rounded-lg px-2.5 py-1.5 transition-colors hover:bg-surface-2/60">
                <p className="flex items-baseline justify-between gap-3">
                  <span className="truncate text-body font-medium text-fg">{n.itemTitle}</span>
                  <span className="shrink-0 text-meta tabular-nums text-muted">{n.date}</span>
                </p>
                <p className="mt-0.5 text-body text-muted">{n.note}</p>
              </li>
            ))}
          </ul>
        </Panel>
      )}
    </div>
  );
}
