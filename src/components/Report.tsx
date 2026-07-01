"use client";

import { useMemo, useState } from "react";
import { useTransactionsView, type JournalInfo } from "@/lib/useTransactionsView";
import { deleteTransaction } from "@/lib/transactions";
import { useIdentity } from "@/lib/AuthProvider";
import { Button, Card, Field, Input, Select, money } from "@/components/ui";
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
  income: "bg-success/15 text-success",
  expense: "bg-warning/15 text-warning",
  transfer: "bg-accent/15 text-accent",
  other: "bg-surface-2 text-muted",
};

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

  function applyPreset(p: Preset) {
    setPreset(p);
    if (p !== "custom") {
      const r = rangeFor(p);
      setFrom(r.from);
      setTo(r.to);
    }
  }

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return txns
      .filter((t) => {
        if (from && t.txn_date < from) return false;
        if (to && t.txn_date > to) return false;
        if (account !== "" && t.debit_journal_id !== account && t.credit_journal_id !== account)
          return false;
        if (type !== "all" && classify(t, journalInfo) !== type) return false;
        if (q) {
          const inName = journalInfo.get(t.debit_journal_id)?.name.toLowerCase() ?? "";
          const outName = journalInfo.get(t.credit_journal_id)?.name.toLowerCase() ?? "";
          const note = (t.remarks ?? "").toLowerCase();
          if (!inName.includes(q) && !outName.includes(q) && !note.includes(q)) return false;
        }
        return true;
      })
      .map((t) => ({ t, type: classify(t, journalInfo) }));
  }, [txns, from, to, account, type, search, journalInfo]);

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

  const rangeText =
    from || to ? `${from || "beginning"} → ${to || "today"}` : "All time";

  if (loading) return <div className="h-64 animate-pulse rounded-2xl border border-border bg-surface" />;
  if (error)
    return (
      <div className="rounded-xl border border-danger/40 bg-danger/10 px-4 py-3 text-danger">
        {error}
      </div>
    );

  return (
    <div className="space-y-5">
      {/* Filter bar (not printed) */}
      <Card className="no-print">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <Field label="Period">
            <Select value={preset} onChange={(e) => applyPreset(e.target.value as Preset)}>
              <option value="this_month">This month</option>
              <option value="last_month">Last month</option>
              <option value="this_year">This year</option>
              <option value="all">All time</option>
              <option value="custom">Custom range</option>
            </Select>
          </Field>
          <Field label="From">
            <Input type="date" value={from} onChange={(e) => { setFrom(e.target.value); setPreset("custom"); }} />
          </Field>
          <Field label="To">
            <Input type="date" value={to} onChange={(e) => { setTo(e.target.value); setPreset("custom"); }} />
          </Field>
          <Field label="Account">
            <Select value={account} onChange={(e) => setAccount(e.target.value ? Number(e.target.value) : "")}>
              <option value="">All accounts</option>
              {journals.map((j) => (
                <option key={j.id} value={j.id}>
                  {j.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Type">
            <Select value={type} onChange={(e) => setType(e.target.value as TxnType | "all")}>
              <option value="all">All types</option>
              <option value="income">Income</option>
              <option value="expense">Expense</option>
              <option value="transfer">Transfer</option>
              <option value="other">Other</option>
            </Select>
          </Field>
          <Field label="Search">
            <Input placeholder="Account or note…" value={search} onChange={(e) => setSearch(e.target.value)} />
          </Field>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <Button onClick={() => window.print()}>🖨 Print / Save PDF</Button>
          <Button variant="surface" onClick={exportCsv}>⬇ Export CSV</Button>
        </div>
      </Card>

      {/* Printable report */}
      <div className="print-area space-y-4">
        <div className="rounded-2xl border border-border bg-surface p-5 shadow-(--shadow)">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-xl font-semibold text-fg">Financial Report</h2>
              <p className="text-sm text-muted">{rangeText}</p>
            </div>
            <div className="text-right text-xs text-muted">
              <p className="font-medium text-fg">{identity?.name}</p>
              <p>Generated {new Date().toLocaleString()}</p>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Stat label="Entries" value={summary.count} plain />
            <Stat label="Income" value={summary.income} tone="text-success" />
            <Stat label="Expense" value={summary.expense} tone="text-warning" />
            <Stat label="Net" value={summary.net} tone={summary.net < 0 ? "text-danger" : "text-fg"} />
          </div>
        </div>

        <div className="overflow-hidden rounded-2xl border border-border bg-surface shadow-(--shadow)">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-surface-2 text-left text-xs uppercase tracking-wide text-muted">
                <th className="px-4 py-2.5 font-medium">Date</th>
                <th className="px-4 py-2.5 font-medium">In</th>
                <th className="px-4 py-2.5 font-medium">Out</th>
                <th className="px-4 py-2.5 font-medium">Type</th>
                <th className="px-4 py-2.5 text-right font-medium">Amount</th>
                <th className="px-2 py-2.5 no-print" />
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-muted">
                    No transactions match these filters.
                  </td>
                </tr>
              ) : (
                rows.map(({ t, type }) => (
                  <tr key={t.id} className="group border-b border-border last:border-0 hover:bg-surface-2/50">
                    <td className="whitespace-nowrap px-4 py-2.5 text-muted">{t.txn_date}</td>
                    <td className="px-4 py-2.5">
                      <span className="text-fg">{journalInfo.get(t.debit_journal_id)?.name}</span>
                      <span className="ml-1 text-xs text-muted">{journalInfo.get(t.debit_journal_id)?.component}</span>
                    </td>
                    <td className="px-4 py-2.5">
                      <span className="text-fg">{journalInfo.get(t.credit_journal_id)?.name}</span>
                      <span className="ml-1 text-xs text-muted">{journalInfo.get(t.credit_journal_id)?.component}</span>
                    </td>
                    <td className="px-4 py-2.5">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium capitalize ${TYPE_BADGE[type]}`}>
                        {type}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-4 py-2.5 text-right font-mono text-fg">
                      {money(Number(t.amount))}
                    </td>
                    <td className="px-2 py-2.5 no-print">
                      <button
                        onClick={() => remove(t.id)}
                        title="Delete"
                        className="rounded p-1 text-muted opacity-0 transition-opacity hover:text-danger group-hover:opacity-100"
                      >
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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
                <tr className="border-t border-border bg-surface-2 font-medium">
                  <td className="px-4 py-2.5 text-muted" colSpan={4}>
                    {summary.count} entries · total moved
                  </td>
                  <td className="px-4 py-2.5 text-right font-mono text-fg">{money(summary.total)}</td>
                  <td className="no-print" />
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  tone = "text-fg",
  plain,
}: {
  label: string;
  value: number;
  tone?: string;
  plain?: boolean;
}) {
  return (
    <div className="rounded-xl border border-border bg-surface-2/50 px-3 py-2">
      <p className="text-xs text-muted">{label}</p>
      <p className={`font-mono text-lg font-semibold ${tone}`}>
        {plain ? value : money(value)}
      </p>
    </div>
  );
}
