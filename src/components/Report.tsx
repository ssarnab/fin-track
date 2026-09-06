"use client";

import { useMemo, useState } from "react";
import { useTransactionsView, type JournalInfo } from "@/lib/useTransactionsView";
import { deleteTransaction } from "@/lib/transactions";
import { useIdentity } from "@/lib/AuthProvider";
import { groupFlow, GROUP_BY_LABEL, type GroupBy } from "@/lib/reports";
import { addDays } from "@/lib/date";
import {
  Button,
  Input,
  Select,
  Panel,
  Stat,
  MeterRow,
  Delta,
  Segmented,
  Skeleton,
  ErrorNote,
  money,
} from "@/components/ui";
import type { Transaction } from "@/lib/types";

type TxnType = "income" | "expense" | "transfer" | "other";

function classify(t: Transaction, info: Map<number, JournalInfo>): TxnType {
  const d = info.get(t.debit_journal_id)?.kind;
  const c = info.get(t.credit_journal_id)?.kind;
  if (c === "income") return "income";
  if (d === "expense") return "expense";
  if (d === "asset" && c === "asset") return "transfer";
  return "other";
}

type Preset = "this_month" | "last_month" | "this_year" | "all" | "custom";

const PRESETS: { value: Preset; label: string }[] = [
  { value: "this_month", label: "This month" },
  { value: "last_month", label: "Last month" },
  { value: "this_year", label: "This year" },
  { value: "all", label: "All time" },
];

function rangeFor(preset: Preset): { from: string; to: string } {
  const now = new Date();
  const iso = (d: Date) => d.toISOString().slice(0, 10);
  switch (preset) {
    case "this_month":
      return { from: iso(new Date(now.getFullYear(), now.getMonth(), 1)), to: iso(new Date(now.getFullYear(), now.getMonth() + 1, 0)) };
    case "last_month":
      return { from: iso(new Date(now.getFullYear(), now.getMonth() - 1, 1)), to: iso(new Date(now.getFullYear(), now.getMonth(), 0)) };
    case "this_year":
      return { from: iso(new Date(now.getFullYear(), 0, 1)), to: iso(new Date(now.getFullYear(), 11, 31)) };
    default:
      return { from: "", to: "" };
  }
}

const TYPE_BADGE: Record<TxnType, string> = {
  income: "bg-success/12 text-success",
  expense: "bg-warning/12 text-warning",
  transfer: "bg-accent/12 text-accent",
  other: "bg-surface-2 text-muted",
};

const BREAKDOWN_COLORS = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)", "var(--chart-4)", "var(--chart-5)", "var(--chart-6)"];

type SortKey = "date" | "amount";

/** A labelled field for the filter toolbar — the label sits above a compact
 * control, so five of them fit on one row without looking like a form. */
function Filter({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block min-w-0">
      <span className="mb-1 block text-micro font-semibold text-muted uppercase">{label}</span>
      {children}
    </label>
  );
}

const controlProps = {
  pad: "px-2.5 py-1.5",
  radius: "rounded-lg",
  ring: "focus:ring-2 focus:ring-ring",
} as const;

function SortHeader({
  label,
  active,
  dir,
  align = "left",
  onClick,
}: {
  label: string;
  active: boolean;
  dir: "asc" | "desc";
  align?: "left" | "right";
  onClick: () => void;
}) {
  return (
    <th className={`px-2.5 py-2 font-medium ${align === "right" ? "text-right" : "text-left"}`}>
      <button
        onClick={onClick}
        className={`no-print inline-flex items-center gap-1 transition-colors hover:text-fg ${active ? "text-fg" : ""}`}
      >
        {label}
        <span className={active ? "opacity-100" : "opacity-0"}>{dir === "desc" ? "↓" : "↑"}</span>
      </button>
      <span className="hidden print:inline">{label}</span>
    </th>
  );
}

export default function Report() {
  const { txns, journals, journalInfo, loading, error, reload } = useTransactionsView();
  const { identity } = useIdentity();

  const [preset, setPreset] = useState<Preset>("this_month");
  const initRange = rangeFor("this_month");
  const [from, setFrom] = useState(initRange.from);
  const [to, setTo] = useState(initRange.to);
  const [account, setAccount] = useState<number | "">("");
  const [type, setType] = useState<TxnType | "all">("all");
  const [search, setSearch] = useState("");
  const [groupBy, setGroupBy] = useState<GroupBy>("account");
  const [sortKey, setSortKey] = useState<SortKey>("date");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  function applyPreset(p: Preset) {
    setPreset(p);
    if (p !== "custom") {
      const r = rangeFor(p);
      setFrom(r.from);
      setTo(r.to);
    }
  }

  function toggleSort(key: SortKey) {
    if (key === sortKey) setSortDir((d) => (d === "desc" ? "asc" : "desc"));
    else {
      setSortKey(key);
      setSortDir("desc");
    }
  }

  // Every filter except the date window, so the same predicate can be reused
  // to measure the preceding period for the comparison.
  const matches = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (t: Transaction, lo: string, hi: string) => {
      if (lo && t.txn_date < lo) return false;
      if (hi && t.txn_date > hi) return false;
      if (account !== "" && t.debit_journal_id !== account && t.credit_journal_id !== account) return false;
      if (type !== "all" && classify(t, journalInfo) !== type) return false;
      if (q) {
        const inName = journalInfo.get(t.debit_journal_id)?.name.toLowerCase() ?? "";
        const outName = journalInfo.get(t.credit_journal_id)?.name.toLowerCase() ?? "";
        const note = (t.remarks ?? "").toLowerCase();
        if (!inName.includes(q) && !outName.includes(q) && !note.includes(q)) return false;
      }
      return true;
    };
  }, [search, account, type, journalInfo]);

  const rows = useMemo(() => {
    const kept = txns.filter((t) => matches(t, from, to)).map((t) => ({ t, type: classify(t, journalInfo) }));
    const dir = sortDir === "desc" ? -1 : 1;
    return kept.sort((a, b) => {
      if (sortKey === "amount") return (Number(a.t.amount) - Number(b.t.amount)) * dir;
      if (a.t.txn_date !== b.t.txn_date) return (a.t.txn_date < b.t.txn_date ? -1 : 1) * dir;
      return (a.t.id - b.t.id) * dir;
    });
  }, [txns, matches, from, to, journalInfo, sortKey, sortDir]);

  /** The window of equal length ending the day before this one. Only
   * meaningful for a bounded range — "all time" has nothing before it. */
  const prevRange = useMemo(() => {
    if (!from || !to) return null;
    const days = Math.round((Date.parse(to) - Date.parse(from)) / 86_400_000);
    const prevTo = addDays(from, -1);
    return { from: addDays(prevTo, -days), to: prevTo };
  }, [from, to]);

  const summary = useMemo(() => {
    let income = 0,
      expense = 0,
      total = 0;
    for (const { t, type } of rows) {
      const a = Number(t.amount);
      total += a;
      if (type === "income") income += a;
      if (type === "expense") expense += a;
    }
    return { income, expense, total, net: income - expense, count: rows.length };
  }, [rows]);

  const prevSummary = useMemo(() => {
    if (!prevRange) return null;
    let income = 0,
      expense = 0,
      count = 0;
    for (const t of txns) {
      if (!matches(t, prevRange.from, prevRange.to)) continue;
      const a = Number(t.amount);
      const ty = classify(t, journalInfo);
      count++;
      if (ty === "income") income += a;
      if (ty === "expense") expense += a;
    }
    return { income, expense, net: income - expense, count };
  }, [txns, matches, prevRange, journalInfo]);

  function delta(curr: number, prev: number | undefined): number | null {
    if (prev === undefined || !prev) return null;
    return ((curr - prev) / Math.abs(prev)) * 100;
  }

  const filtered = useMemo(() => rows.map((r) => r.t), [rows]);
  const expenseGroups = useMemo(
    () => groupFlow(filtered, journalInfo, "expense", groupBy),
    [filtered, journalInfo, groupBy],
  );
  const incomeGroups = useMemo(
    () => groupFlow(filtered, journalInfo, "income", groupBy),
    [filtered, journalInfo, groupBy],
  );
  const largest = useMemo(() => [...rows].sort((a, b) => Number(b.t.amount) - Number(a.t.amount)).slice(0, 5), [rows]);

  async function remove(id: number) {
    if (!window.confirm("Delete this transaction?")) return;
    try {
      await deleteTransaction(id);
      reload();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Failed");
    }
  }

  function exportCsv() {
    const header = ["Date", "In (account)", "Out (account)", "Type", "Amount", "Note"];
    const lines = rows.map(({ t, type }) => {
      const cells = [
        t.txn_date,
        journalInfo.get(t.debit_journal_id)?.name ?? "",
        journalInfo.get(t.credit_journal_id)?.name ?? "",
        type,
        String(Number(t.amount)),
        (t.remarks ?? "").replace(/"/g, '""'),
      ];
      return cells.map((c) => `"${c}"`).join(",");
    });
    const csv = [header.join(","), ...lines].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `fintrack-report-${from || "all"}_${to || "all"}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const rangeText = from || to ? `${from || "beginning"} → ${to || "today"}` : "All time";

  if (loading) {
    return (
      <div className="space-y-2">
        <Skeleton className="h-28" />
        <Skeleton className="h-24" />
        <Skeleton className="h-72" />
      </div>
    );
  }
  if (error) return <ErrorNote>{error}</ErrorNote>;

  const groupByControl = (
    <Segmented
      size="xs"
      value={groupBy}
      onChange={setGroupBy}
      options={(["account", "group", "category"] as GroupBy[]).map((v) => ({ value: v, label: GROUP_BY_LABEL[v] }))}
    />
  );

  return (
    <div className="space-y-2">
      {/* Filter bar (not printed) */}
      <Panel
        className="no-print"
        title="Filters"
        subtitle={`${summary.count} of ${txns.length} entries`}
        actions={
          <>
            <Button variant="ghost" onClick={exportCsv} pad="px-2.5 py-1.5" text="text-meta">
              Export CSV
            </Button>
            <Button onClick={() => window.print()} pad="px-2.5 py-1.5" text="text-meta">
              Print / PDF
            </Button>
          </>
        }
        bodyPad="p-2.5"
      >
        <div className="mb-2.5 flex flex-wrap items-center gap-1">
          {PRESETS.map((p) => (
            <button
              key={p.value}
              onClick={() => applyPreset(p.value)}
              className={`rounded-lg px-2.5 py-1 text-meta font-medium transition-colors ${
                preset === p.value ? "bg-primary text-primary-fg" : "bg-surface-2 text-muted hover:text-fg"
              }`}
            >
              {p.label}
            </button>
          ))}
          {preset === "custom" && (
            <span className="rounded-lg bg-primary/12 px-2.5 py-1 text-meta font-medium text-primary">Custom</span>
          )}
          <span className="ml-auto flex items-center gap-2">
            <span className="text-micro font-semibold text-muted uppercase">Break down by</span>
            {groupByControl}
          </span>
        </div>

        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
          <Filter label="From">
            <Input
              type="date"
              value={from}
              onChange={(e) => {
                setFrom(e.target.value);
                setPreset("custom");
              }}
              {...controlProps}
            />
          </Filter>
          <Filter label="To">
            <Input
              type="date"
              value={to}
              onChange={(e) => {
                setTo(e.target.value);
                setPreset("custom");
              }}
              {...controlProps}
            />
          </Filter>
          <Filter label="Account">
            <Select
              value={account}
              onChange={(e) => setAccount(e.target.value ? Number(e.target.value) : "")}
              {...controlProps}
            >
              <option value="">All accounts</option>
              {journals.map((j) => (
                <option key={j.id} value={j.id}>
                  {j.name}
                </option>
              ))}
            </Select>
          </Filter>
          <Filter label="Type">
            <Select value={type} onChange={(e) => setType(e.target.value as TxnType | "all")} {...controlProps}>
              <option value="all">All types</option>
              <option value="income">Income</option>
              <option value="expense">Expense</option>
              <option value="transfer">Transfer</option>
              <option value="other">Other</option>
            </Select>
          </Filter>
          <Filter label="Search">
            <Input
              placeholder="Account or note…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              {...controlProps}
            />
          </Filter>
        </div>
      </Panel>

      {/* Printable report */}
      <div className="print-area space-y-3">
        <Panel bodyPad="p-3">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold tracking-tight text-fg">Financial Report</h2>
              <p className="text-meta tabular-nums text-muted">
                {rangeText}
                {prevRange && (
                  <span className="ml-2 text-muted">
                    vs {prevRange.from} → {prevRange.to}
                  </span>
                )}
              </p>
            </div>
            <div className="text-right text-meta text-muted">
              <p className="font-medium text-fg">{identity?.name}</p>
              <p>Generated {new Date().toLocaleString()}</p>
            </div>
          </div>

          <div className="mt-2.5 grid grid-cols-2 gap-2 sm:grid-cols-4">
            <Stat
              label="Entries"
              value={summary.count}
              hint={prevSummary ? <Delta value={delta(summary.count, prevSummary.count)} /> : undefined}
            />
            <Stat
              label="Income"
              value={money(summary.income)}
              tone="success"
              hint={prevSummary ? <Delta value={delta(summary.income, prevSummary.income)} /> : undefined}
            />
            <Stat
              label="Expense"
              value={money(summary.expense)}
              tone="warning"
              hint={prevSummary ? <Delta value={delta(summary.expense, prevSummary.expense)} invert /> : undefined}
            />
            <Stat
              label="Net"
              value={money(summary.net)}
              tone={summary.net < 0 ? "danger" : "fg"}
              hint={prevSummary ? <Delta value={delta(summary.net, prevSummary.net)} /> : undefined}
            />
          </div>
        </Panel>

        {(expenseGroups.length > 0 || incomeGroups.length > 0) && (
          <div className="grid gap-2 lg:grid-cols-2">
            {expenseGroups.length > 0 && (
              <Panel
                title={`Spending by ${GROUP_BY_LABEL[groupBy].toLowerCase()}`}
                subtitle={`${expenseGroups.length} · ${money(summary.expense)}`}
              >
                <div className="space-y-2">
                  {expenseGroups.map((c, i) => {
                    const pct = summary.expense ? (c.value / summary.expense) * 100 : 0;
                    return (
                      <MeterRow
                        key={c.name}
                        label={c.name}
                        value={
                          <>
                            {money(c.value)} <span className="text-meta text-muted">{pct.toFixed(0)}%</span>
                          </>
                        }
                        pct={pct}
                        color={BREAKDOWN_COLORS[i % BREAKDOWN_COLORS.length]}
                      />
                    );
                  })}
                </div>
              </Panel>
            )}
            {incomeGroups.length > 0 && (
              <Panel
                title={`Income by ${GROUP_BY_LABEL[groupBy].toLowerCase()}`}
                subtitle={`${incomeGroups.length} · ${money(summary.income)}`}
              >
                <div className="space-y-2">
                  {incomeGroups.map((c) => {
                    const pct = summary.income ? (c.value / summary.income) * 100 : 0;
                    return (
                      <MeterRow
                        key={c.name}
                        label={c.name}
                        value={
                          <>
                            {money(c.value)} <span className="text-meta text-muted">{pct.toFixed(0)}%</span>
                          </>
                        }
                        pct={pct}
                        color="var(--success)"
                      />
                    );
                  })}
                </div>
              </Panel>
            )}
          </div>
        )}

        {largest.length > 0 && (
          <Panel title="Largest movements" subtitle="Biggest entries matching these filters" bodyPad="p-1.5">
            <ul>
              {largest.map(({ t, type }) => (
                <li
                  key={t.id}
                  className="flex items-center gap-2.5 rounded-lg px-2.5 py-1.5 transition-colors hover:bg-surface-2/60"
                >
                  <span className="w-22 shrink-0 text-meta whitespace-nowrap tabular-nums text-muted">{t.txn_date}</span>
                  <span
                    className={`shrink-0 rounded-full px-1.5 py-0.5 text-micro font-medium capitalize ${TYPE_BADGE[type]}`}
                  >
                    {type}
                  </span>
                  <span className="flex min-w-0 flex-1 items-center gap-1.5 text-body">
                    <span className="truncate text-muted">{journalInfo.get(t.credit_journal_id)?.name}</span>
                    <span className="shrink-0 text-muted">→</span>
                    <span className="truncate text-fg">{journalInfo.get(t.debit_journal_id)?.name}</span>
                  </span>
                  <span className="shrink-0 text-body font-semibold tabular-nums text-fg">
                    {money(Number(t.amount))}
                  </span>
                </li>
              ))}
            </ul>
          </Panel>
        )}

        <Panel bodyPad="p-0">
          <div className="overflow-x-auto">
            <table className="w-full min-w-3xl text-body">
              <thead>
                <tr className="border-b border-border text-left text-micro font-semibold text-muted uppercase">
                  <SortHeader
                    label="Date"
                    active={sortKey === "date"}
                    dir={sortDir}
                    onClick={() => toggleSort("date")}
                  />
                  <th className="px-2.5 py-2 font-medium">Out</th>
                  <th className="px-2.5 py-2 font-medium">In</th>
                  <th className="px-2.5 py-2 font-medium">Type</th>
                  <th className="px-2.5 py-2 font-medium">Note</th>
                  <SortHeader
                    label="Amount"
                    active={sortKey === "amount"}
                    dir={sortDir}
                    align="right"
                    onClick={() => toggleSort("amount")}
                  />
                  <th className="no-print w-8 px-1 py-2" />
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-2.5 py-10 text-center text-muted">
                      No transactions match these filters.
                    </td>
                  </tr>
                ) : (
                  rows.map(({ t, type }) => (
                    <tr
                      key={t.id}
                      className="group border-b border-border/60 transition-colors last:border-0 hover:bg-surface-2/50"
                    >
                      <td className="px-2.5 py-1.5 whitespace-nowrap tabular-nums text-muted">{t.txn_date}</td>
                      <td className="max-w-44 px-2.5 py-1.5">
                        <span className="flex items-baseline gap-1.5">
                          <span className="truncate text-fg">{journalInfo.get(t.credit_journal_id)?.name}</span>
                          <span className="shrink-0 truncate text-micro text-muted">
                            {journalInfo.get(t.credit_journal_id)?.ledger}
                          </span>
                        </span>
                      </td>
                      <td className="max-w-44 px-2.5 py-1.5">
                        <span className="flex items-baseline gap-1.5">
                          <span className="truncate text-fg">{journalInfo.get(t.debit_journal_id)?.name}</span>
                          <span className="shrink-0 truncate text-micro text-muted">
                            {journalInfo.get(t.debit_journal_id)?.ledger}
                          </span>
                        </span>
                      </td>
                      <td className="px-2.5 py-1.5">
                        <span
                          className={`rounded-full px-1.5 py-0.5 text-micro font-medium capitalize ${TYPE_BADGE[type]}`}
                        >
                          {type}
                        </span>
                      </td>
                      <td className="max-w-40 px-2.5 py-1.5">
                        <span className="block truncate text-meta text-muted" title={t.remarks ?? undefined}>
                          {t.remarks || "—"}
                        </span>
                      </td>
                      <td className="px-2.5 py-1.5 text-right font-medium whitespace-nowrap tabular-nums text-fg">
                        {money(Number(t.amount))}
                      </td>
                      <td className="no-print px-1 py-1.5">
                        <button
                          onClick={() => remove(t.id)}
                          title="Delete"
                          className="grid h-6 w-6 place-items-center rounded-md text-muted opacity-0 transition-all group-hover:opacity-100 hover:bg-danger/10 hover:text-danger"
                        >
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m2 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
                          </svg>
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
              {rows.length > 0 && (
                <tfoot>
                  <tr className="border-t border-border bg-surface-2/50">
                    <td className="px-2.5 py-1.5 text-meta text-muted" colSpan={5}>
                      {summary.count} entries · total moved
                    </td>
                    <td className="px-2.5 py-1.5 text-right font-semibold tabular-nums text-fg">{money(summary.total)}</td>
                    <td className="no-print" />
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </Panel>
      </div>
    </div>
  );
}
