"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ResponsiveContainer,
  ComposedChart,
  AreaChart,
  Area,
  Bar,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";
import { useReportData } from "@/lib/useReportData";
import {
  money,
  Panel,
  Stat,
  MeterRow,
  Delta,
  Segmented,
  Skeleton,
  EmptyState,
  ErrorNote,
} from "@/components/ui";
import {
  topSlices,
  monthRange,
  flowTotals,
  pctChange,
  savingsRate,
  groupFlow,
  netWorthChange,
  GROUP_BY_LABEL,
  type Slice,
  type GroupBy,
} from "@/lib/reports";
import { addMonths, todayISO } from "@/lib/date";

const CHART_COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
  "var(--chart-6)",
];

// One axis/grid treatment for every chart on the page — recharts defaults are
// heavy, and three charts styled three ways is what reads as unfinished.
const AXIS = { tick: { fill: "var(--muted)", fontSize: 11 }, stroke: "var(--border)", tickLine: false } as const;
const GRID = { strokeDasharray: "2 4", stroke: "var(--border)" } as const;

type Range = "3" | "6" | "12" | "all";
const RANGES: { value: Range; label: string }[] = [
  { value: "3", label: "3M" },
  { value: "6", label: "6M" },
  { value: "12", label: "12M" },
  { value: "all", label: "All" },
];

/** Compact money for axis ticks — "৳12.4k" beats "৳12,400.00" in 10px type. */
function shortMoney(n: number): string {
  const abs = Math.abs(n);
  if (abs >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `${(n / 1_000).toFixed(abs >= 10_000 ? 0 : 1)}k`;
  return String(Math.round(n));
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
    <div className="rounded-lg border border-border bg-surface/95 px-2.5 py-1.5 text-meta shadow-(--shadow-lg) backdrop-blur-sm">
      {label && <p className="mb-1 font-medium text-fg">{label}</p>}
      {payload.map((p, i) => (
        <p key={i} className="flex items-center gap-1.5 text-muted">
          <span className="inline-block h-1.5 w-1.5 rounded-full" style={{ background: p.color }} />
          {p.name}
          <span className="ml-auto pl-3 font-medium tabular-nums text-fg">{money(Number(p.value ?? 0))}</span>
        </p>
      ))}
    </div>
  );
}

export default function Dashboard() {
  const {
    totals,
    expenseSlices,
    assetSlices,
    monthly,
    trend,
    txnCount,
    txns,
    kinds,
    journalMeta,
    loading,
    error,
  } = useReportData();

  // Recharts measures the DOM, so it can only render after mount.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const [range, setRange] = useState<Range>("6");
  const [spendBy, setSpendBy] = useState<GroupBy>("account");

  const thisMonth = useMemo(() => monthRange(0), []);
  const lastMonth = useMemo(() => monthRange(1), []);

  const current = useMemo(
    () => flowTotals(txns, kinds, thisMonth.from, thisMonth.to),
    [txns, kinds, thisMonth],
  );
  const previous = useMemo(
    () => flowTotals(txns, kinds, lastMonth.from, lastMonth.to),
    [txns, kinds, lastMonth],
  );
  const nwChange = useMemo(
    () => netWorthChange(txns, kinds, thisMonth.from, thisMonth.to),
    [txns, kinds, thisMonth],
  );

  const rate = savingsRate(current);
  const prevRate = savingsRate(previous);

  // Charts follow the range toggle; "all" leaves both series untrimmed.
  const cutoff = range === "all" ? null : addMonths(todayISO(), -Number(range));
  const trendData = useMemo(() => (cutoff ? trend.filter((p) => p.date >= cutoff) : trend), [trend, cutoff]);
  const monthlyData = useMemo(() => {
    const n = range === "all" ? 12 : Number(range);
    return monthly.slice(-n).map((m) => ({ ...m, net: m.income - m.expense }));
  }, [monthly, range]);

  const topSpending = useMemo(
    () => groupFlow(txns, journalMeta, "expense", spendBy, thisMonth.from, thisMonth.to),
    [txns, journalMeta, spendBy, thisMonth],
  );
  const spendTotal = topSpending.reduce((s, x) => s + x.value, 0);

  const recent = useMemo(() => txns.slice(0, 6), [txns]);

  if (loading) {
    return (
      <div className="space-y-2">
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-16" />
          ))}
        </div>
        <Skeleton className="h-52" />
        <div className="grid gap-2 lg:grid-cols-2">
          <Skeleton className="h-44" />
          <Skeleton className="h-44" />
        </div>
      </div>
    );
  }
  if (error) return <ErrorNote>{error}</ErrorNote>;

  const pieData: Slice[] = topSlices(expenseSlices.length ? expenseSlices : assetSlices);
  const pieTitle = expenseSlices.length ? "Expense breakdown" : "Asset allocation";
  const pieTotal = pieData.reduce((s, p) => s + p.value, 0);
  const hasMonthly = monthlyData.some((m) => m.income || m.expense);

  return (
    <div className="space-y-2">
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        <Stat
          label="Net worth"
          value={money(totals.netWorth)}
          tone={totals.netWorth < 0 ? "danger" : "primary"}
          hint={
            <span className="flex items-center gap-1">
              <span className={nwChange >= 0 ? "text-success" : "text-danger"}>
                {nwChange >= 0 ? "+" : "−"}
                {money(Math.abs(nwChange))}
              </span>
              this month
            </span>
          }
        />
        <Stat label="Assets" value={money(totals.assets)} tone="success" />
        <Stat label="Liabilities" value={money(totals.liabilities)} tone="danger" />
        <Stat
          label="Savings rate"
          value={rate === null ? "—" : `${rate.toFixed(0)}%`}
          tone={rate !== null && rate >= 20 ? "success" : rate !== null && rate < 0 ? "danger" : "fg"}
          hint={
            <span className="flex items-center gap-1">
              <Delta value={rate !== null && prevRate !== null ? rate - prevRate : null} suffix="pt" />
              vs {lastMonth.label}
            </span>
          }
        />
      </div>

      {txnCount === 0 ? (
        <EmptyState title="No transactions yet." hint="Add entries from Home to unlock charts and insights." />
      ) : (
        <>
          <Panel title="This month" subtitle={`${thisMonth.label} · ${current.count} entries`} bodyPad="p-3">
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
              <Stat
                label="Income"
                value={money(current.income)}
                tone="success"
                hint={
                  <span className="flex items-center gap-1">
                    <Delta value={pctChange(current.income, previous.income)} /> vs {lastMonth.label}
                  </span>
                }
              />
              <Stat
                label="Expense"
                value={money(current.expense)}
                tone="warning"
                hint={
                  <span className="flex items-center gap-1">
                    {/* Spending up is bad news, so the colour flips. */}
                    <Delta value={pctChange(current.expense, previous.expense)} invert /> vs {lastMonth.label}
                  </span>
                }
              />
              <Stat
                label="Net"
                value={money(current.net)}
                tone={current.net < 0 ? "danger" : "fg"}
                hint={
                  <span className="flex items-center gap-1">
                    <Delta value={pctChange(current.net, previous.net)} /> vs {lastMonth.label}
                  </span>
                }
              />
            </div>
          </Panel>

          <Panel
            title="Net worth trend"
            subtitle={trendData.length ? `${trendData.length} days with movement` : undefined}
            actions={<Segmented value={range} onChange={setRange} options={RANGES} />}
            bodyPad="px-1 pt-3 pb-1"
          >
            <div className="h-52">
              {mounted && trendData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={trendData} margin={{ top: 4, right: 12, left: 4, bottom: 0 }}>
                    <defs>
                      <linearGradient id="nw" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="var(--chart-1)" stopOpacity={0.35} />
                        <stop offset="100%" stopColor="var(--chart-1)" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid {...GRID} vertical={false} />
                    <XAxis dataKey="date" {...AXIS} axisLine={false} minTickGap={24} />
                    <YAxis {...AXIS} axisLine={false} width={46} tickFormatter={shortMoney} />
                    <Tooltip content={<TooltipBox />} cursor={{ stroke: "var(--border-strong)", strokeWidth: 1 }} />
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
                <div className="grid h-full place-items-center text-body text-muted">
                  No movement in this range
                </div>
              )}
            </div>
          </Panel>

          <Panel
            title="Cash flow"
            subtitle="Income and expense per month, with the net on top"
            bodyPad="px-1 pt-3 pb-1"
          >
            <div className="h-52">
              {mounted && hasMonthly ? (
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={monthlyData} margin={{ top: 4, right: 12, left: 4, bottom: 0 }} barGap={2}>
                    <CartesianGrid {...GRID} vertical={false} />
                    <XAxis dataKey="month" {...AXIS} axisLine={false} />
                    <YAxis {...AXIS} axisLine={false} width={46} tickFormatter={shortMoney} />
                    <Tooltip content={<TooltipBox />} cursor={{ fill: "var(--surface-2)", opacity: 0.6 }} />
                    <Bar dataKey="income" name="Income" fill="var(--chart-4)" radius={[3, 3, 0, 0]} maxBarSize={20} />
                    <Bar dataKey="expense" name="Expense" fill="var(--chart-5)" radius={[3, 3, 0, 0]} maxBarSize={20} />
                    <Line
                      type="monotone"
                      dataKey="net"
                      name="Net"
                      stroke="var(--chart-1)"
                      strokeWidth={2}
                      dot={{ r: 2, fill: "var(--chart-1)", strokeWidth: 0 }}
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              ) : (
                <div className="grid h-full place-items-center text-body text-muted">No data in this range</div>
              )}
            </div>
            <div className="flex items-center justify-center gap-4 pb-1.5 text-micro text-muted">
              <span className="flex items-center gap-1.5">
                <span className="h-1.5 w-3 rounded-full bg-chart-4" /> Income
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-1.5 w-3 rounded-full bg-chart-5" /> Expense
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-0.5 w-3 rounded-full bg-chart-1" /> Net
              </span>
            </div>
          </Panel>

          <div className="grid gap-2 lg:grid-cols-2">
            <Panel
              title="Top spending"
              subtitle={`${thisMonth.label} · ${money(spendTotal)}`}
              actions={
                <Segmented
                  size="xs"
                  value={spendBy}
                  onChange={setSpendBy}
                  options={(["account", "group", "category"] as GroupBy[]).map((v) => ({
                    value: v,
                    label: GROUP_BY_LABEL[v],
                  }))}
                />
              }
            >
              {topSpending.length === 0 ? (
                <p className="py-8 text-center text-body text-muted">Nothing spent this month.</p>
              ) : (
                <div className="space-y-2">
                  {topSpending.slice(0, 6).map((s, i) => (
                    <MeterRow
                      key={s.name}
                      label={s.name}
                      value={money(s.value)}
                      pct={spendTotal ? (s.value / spendTotal) * 100 : 0}
                      color={CHART_COLORS[i % CHART_COLORS.length]}
                    />
                  ))}
                </div>
              )}
            </Panel>

            <Panel title={pieTitle} subtitle={pieData.length ? `${pieData.length} categories` : undefined}>
              {pieData.length === 0 ? (
                <div className="grid h-40 place-items-center text-body text-muted">No data yet</div>
              ) : (
                <div className="flex items-center gap-4">
                  <div className="relative h-36 w-36 shrink-0">
                    {mounted && (
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={pieData}
                            dataKey="value"
                            nameKey="name"
                            cx="50%"
                            cy="50%"
                            innerRadius={46}
                            outerRadius={68}
                            paddingAngle={2}
                            cornerRadius={3}
                            stroke="none"
                          >
                            {pieData.map((_, i) => (
                              <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip content={<TooltipBox />} />
                        </PieChart>
                      </ResponsiveContainer>
                    )}
                    {/* The hole is dead space otherwise — the total belongs in it. */}
                    <div className="pointer-events-none absolute inset-0 grid place-items-center text-center">
                      <div>
                        <p className="text-micro font-semibold text-muted uppercase">Total</p>
                        <p className="mt-0.5 text-body font-semibold tabular-nums text-fg">{money(pieTotal)}</p>
                      </div>
                    </div>
                  </div>

                  {/* recharts' own <Legend> wraps unpredictably and overlaps the
                      chart past a handful of entries, so `topSlices` caps the
                      data and we lay the legend out ourselves. */}
                  <ul className="min-w-0 flex-1 space-y-1.5">
                    {pieData.map((s, i) => (
                      <li key={s.name} className="flex items-center gap-2 text-meta">
                        <span
                          className="h-2 w-2 shrink-0 rounded-full"
                          style={{ background: CHART_COLORS[i % CHART_COLORS.length] }}
                        />
                        <span className="truncate text-muted">{s.name}</span>
                        <span className="ml-auto shrink-0 font-medium tabular-nums text-fg">{money(s.value)}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </Panel>
          </div>

          <Panel
            title="Recent activity"
            subtitle={`Last ${recent.length} of ${txnCount}`}
            actions={
              <Link href="/report" className="text-meta font-medium text-primary hover:underline">
                View all
              </Link>
            }
            bodyPad="p-1.5"
          >
            <ul>
              {recent.map((t) => {
                const from = journalMeta.get(t.credit_journal_id);
                const to = journalMeta.get(t.debit_journal_id);
                return (
                  <li
                    key={t.id}
                    className="flex items-center gap-2.5 rounded-lg px-2.5 py-1.5 transition-colors hover:bg-surface-2/60"
                  >
                    <span className="w-12 shrink-0 text-meta whitespace-nowrap tabular-nums text-muted">{t.txn_date.slice(5)}</span>
                    <span className="flex min-w-0 flex-1 items-center gap-1.5 text-body">
                      <span className="truncate text-muted">{from?.name ?? "—"}</span>
                      <span className="shrink-0 text-muted">→</span>
                      <span className="truncate text-fg">{to?.name ?? "—"}</span>
                    </span>
                    {t.remarks && (
                      <span className="hidden max-w-40 shrink truncate text-meta text-muted sm:block">
                        {t.remarks}
                      </span>
                    )}
                    <span className="shrink-0 text-body font-medium tabular-nums text-fg">
                      {money(Number(t.amount))}
                    </span>
                  </li>
                );
              })}
            </ul>
          </Panel>
        </>
      )}
    </div>
  );
}
