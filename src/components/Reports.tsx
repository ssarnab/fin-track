"use client";

import { useEffect, useState } from "react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import { useReportData } from "@/lib/useReportData";
import { money } from "@/components/ui";
import type { Slice } from "@/lib/reports";

const CHART_COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
  "var(--chart-6)",
];

function StatCard({
  label,
  value,
  tone = "fg",
  hint,
}: {
  label: string;
  value: number;
  tone?: "fg" | "success" | "danger" | "primary";
  hint?: string;
}) {
  const toneClass = {
    fg: "text-fg",
    success: "text-success",
    danger: "text-danger",
    primary: "text-primary",
  }[tone];
  return (
    <div className="rounded-2xl border border-border bg-surface p-4 shadow-[var(--shadow)]">
      <p className="text-xs font-medium uppercase tracking-wide text-muted">{label}</p>
      <p className={`mt-1 font-mono text-2xl font-semibold ${toneClass}`}>{money(value)}</p>
      {hint && <p className="mt-0.5 text-xs text-muted">{hint}</p>}
    </div>
  );
}

function ChartCard({
  title,
  children,
  empty,
}: {
  title: string;
  children: React.ReactNode;
  empty?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-border bg-surface p-5 shadow-[var(--shadow)]">
      <h3 className="mb-4 font-semibold text-fg">{title}</h3>
      {empty ? (
        <div className="grid h-56 place-items-center text-sm text-muted">No data yet</div>
      ) : (
        <div className="h-56">{children}</div>
      )}
    </div>
  );
}

function TooltipBox({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: { name?: string; value?: number; color?: string }[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-border bg-surface-2 px-3 py-2 text-xs shadow-[var(--shadow)]">
      {label && <p className="mb-1 font-medium text-fg">{label}</p>}
      {payload.map((p, i) => (
        <p key={i} className="flex items-center gap-2 text-muted">
          <span className="inline-block h-2 w-2 rounded-full" style={{ background: p.color }} />
          {p.name}: <span className="font-mono text-fg">{money(Number(p.value ?? 0))}</span>
        </p>
      ))}
    </div>
  );
}

export default function Reports() {
  const { totals, expenseSlices, assetSlices, monthly, trend, txnCount, loading, error } =
    useReportData();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-24 animate-pulse rounded-2xl border border-border bg-surface" />
          ))}
        </div>
        <div className="h-72 animate-pulse rounded-2xl border border-border bg-surface" />
      </div>
    );
  }
  if (error) {
    return (
      <div className="rounded-xl border border-danger/40 bg-danger/10 px-4 py-3 text-danger">
        {error}
      </div>
    );
  }

  const pieData: Slice[] = expenseSlices.length ? expenseSlices : assetSlices;
  const pieTitle = expenseSlices.length ? "Expense breakdown" : "Asset allocation";
  const hasMonthly = monthly.some((m) => m.income || m.expense);

  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Net worth"
          value={totals.netWorth}
          tone={totals.netWorth < 0 ? "danger" : "primary"}
          hint="Assets − Liabilities"
        />
        <StatCard label="Assets" value={totals.assets} tone="success" />
        <StatCard label="Liabilities" value={totals.liabilities} tone="danger" />
        <StatCard label="Total spent" value={totals.expense} tone="fg" hint={`${txnCount} transactions`} />
      </div>

      {txnCount === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-surface/60 p-10 text-center">
          <p className="text-fg">No transactions yet.</p>
          <p className="mt-1 text-sm text-muted">Add entries from Home to unlock charts & insights.</p>
        </div>
      ) : (
        <>
          <ChartCard title="Net worth trend">
            {mounted && trend.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trend} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
                  <defs>
                    <linearGradient id="nw" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--chart-1)" stopOpacity={0.5} />
                      <stop offset="100%" stopColor="var(--chart-1)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="date" tick={{ fill: "var(--muted)", fontSize: 11 }} stroke="var(--border)" />
                  <YAxis tick={{ fill: "var(--muted)", fontSize: 11 }} stroke="var(--border)" width={54} />
                  <Tooltip content={<TooltipBox />} />
                  <Area
                    type="monotone"
                    dataKey="value"
                    name="Net worth"
                    stroke="var(--chart-1)"
                    strokeWidth={2}
                    fill="url(#nw)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="grid h-full place-items-center text-sm text-muted">
                Not enough data for a trend
              </div>
            )}
          </ChartCard>

          <div className="grid gap-5 lg:grid-cols-2">
            <ChartCard title="Income vs Expense (6 mo)" empty={!hasMonthly}>
              {mounted && (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={monthly} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                    <XAxis dataKey="month" tick={{ fill: "var(--muted)", fontSize: 11 }} stroke="var(--border)" />
                    <YAxis tick={{ fill: "var(--muted)", fontSize: 11 }} stroke="var(--border)" width={54} />
                    <Tooltip content={<TooltipBox />} cursor={{ fill: "var(--surface-2)" }} />
                    <Legend wrapperStyle={{ fontSize: 12, color: "var(--muted)" }} />
                    <Bar dataKey="income" name="Income" fill="var(--chart-3)" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="expense" name="Expense" fill="var(--chart-5)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </ChartCard>

            <ChartCard title={pieTitle} empty={pieData.length === 0}>
              {mounted && pieData.length > 0 && (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={45}
                      outerRadius={80}
                      paddingAngle={2}
                    >
                      {pieData.map((_, i) => (
                        <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} stroke="var(--surface)" />
                      ))}
                    </Pie>
                    <Tooltip content={<TooltipBox />} />
                    <Legend wrapperStyle={{ fontSize: 12, color: "var(--muted)" }} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </ChartCard>
          </div>
        </>
      )}
    </div>
  );
}
