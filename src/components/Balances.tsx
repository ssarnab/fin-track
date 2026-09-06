"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { listBalances } from "@/lib/transactions";
import { useRealtime } from "@/lib/useRealtime";
import { Panel, Stat, Segmented, Input, Skeleton, EmptyState, ErrorNote, money } from "@/components/ui";
import type { JournalBalance } from "@/lib/types";

type Group = {
  component_name: string;
  component_kind: string;
  total: number;
  rows: JournalBalance[];
};

const KIND_DOT: Record<string, string> = {
  asset: "bg-success",
  liability: "bg-danger",
  equity: "bg-primary",
  income: "bg-chart-3",
  expense: "bg-warning",
};

type SortKey = "amount" | "name";

export default function Balances() {
  const [rows, setRows] = useState<JournalBalance[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<SortKey>("amount");
  const [hideZero, setHideZero] = useState(true);

  const load = useCallback(async () => {
    try {
      setRows(await listBalances());
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load balances");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);
  useRealtime(["transactions", "journal", "ledger", "component"], load);

  // Net worth is the headline the page was missing — the per-category totals
  // were there, but nothing added them up.
  const totals = useMemo(() => {
    let assets = 0;
    let liabilities = 0;
    for (const r of rows) {
      const v = Number(r.balance);
      if (r.component_kind === "asset") assets += v;
      if (r.component_kind === "liability") liabilities += v;
    }
    return { assets, liabilities, netWorth: assets - liabilities };
  }, [rows]);

  const groups: Group[] = useMemo(() => {
    const q = query.trim().toLowerCase();
    const out: Group[] = [];
    for (const r of rows) {
      const bal = Number(r.balance);
      if (hideZero && bal === 0) continue;
      if (q && !r.journal_name.toLowerCase().includes(q) && !r.ledger_name.toLowerCase().includes(q)) continue;

      let g = out.find((x) => x.component_name === r.component_name);
      if (!g) {
        g = { component_name: r.component_name, component_kind: r.component_kind, total: 0, rows: [] };
        out.push(g);
      }
      g.rows.push(r);
      g.total += bal;
    }
    for (const g of out) {
      g.rows.sort((a, b) =>
        sort === "name"
          ? a.journal_name.localeCompare(b.journal_name)
          : Math.abs(Number(b.balance)) - Math.abs(Number(a.balance)),
      );
    }
    return out;
  }, [rows, query, hideZero, sort]);

  const shownCount = groups.reduce((s, g) => s + g.rows.length, 0);

  if (loading) {
    return (
      <div className="space-y-2">
        <Skeleton className="h-20" />
        {[0, 1].map((i) => (
          <Skeleton key={i} className="h-40" />
        ))}
      </div>
    );
  }
  if (error) return <ErrorNote>{error}</ErrorNote>;
  if (rows.length === 0) {
    return <EmptyState title="No accounts yet." hint="Add some under Accounts, then your balances show up here." />;
  }

  return (
    <div className="space-y-2">
      <div className="grid gap-2 sm:grid-cols-3">
        <Stat
          label="Net worth"
          value={money(totals.netWorth)}
          tone={totals.netWorth < 0 ? "danger" : "primary"}
          hint="Assets − Liabilities"
        />
        <Stat label="Assets" value={money(totals.assets)} tone="success" />
        <Stat label="Liabilities" value={money(totals.liabilities)} tone="danger" />
      </div>

      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-border bg-surface p-1.5 shadow-(--shadow)">
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Find an account…"
          pad="px-2.5 py-1.5"
          radius="rounded-lg"
          ring="focus:ring-2 focus:ring-ring"
          width="min-w-44 flex-1"
        />
        <Segmented
          value={sort}
          onChange={setSort}
          options={[
            { value: "amount", label: "By amount" },
            { value: "name", label: "A–Z" },
          ]}
        />
        <button
          onClick={() => setHideZero((v) => !v)}
          className={`rounded-lg px-2.5 py-1 text-meta font-medium transition-colors ${
            hideZero ? "bg-primary/12 text-primary" : "bg-surface-2 text-muted hover:text-fg"
          }`}
        >
          {hideZero ? "Hiding empty" : "Showing empty"}
        </button>
        <span className="ml-auto pr-1 text-meta tabular-nums text-muted">{shownCount} accounts</span>
      </div>

      {groups.length === 0 ? (
        <EmptyState title="Nothing matches." hint="Try a different search, or show empty accounts." />
      ) : (
        groups.map((g) => {
          // Bars are scaled within their own category — comparing a savings
          // account against a coffee budget on one global scale says nothing.
          const max = Math.max(...g.rows.map((x) => Math.abs(Number(x.balance))), 1);
          const groupTotal = g.rows.reduce((s, r) => s + Math.abs(Number(r.balance)), 0) || 1;
          return (
            <Panel
              key={g.component_name}
              title={
                <span className="flex items-center gap-2">
                  <span className={`h-1.5 w-1.5 rounded-full ${KIND_DOT[g.component_kind] ?? "bg-muted"}`} />
                  {g.component_name}
                </span>
              }
              subtitle={
                <span className="capitalize">
                  {g.component_kind} · {g.rows.length} accounts
                </span>
              }
              actions={
                <span className={`text-title font-semibold tabular-nums ${g.total < 0 ? "text-danger" : "text-fg"}`}>
                  {money(g.total)}
                </span>
              }
              bodyPad="p-1.5"
            >
              <ul>
                {g.rows.map((r) => {
                  const bal = Number(r.balance);
                  const neg = bal < 0;
                  const pct = Math.round((Math.abs(bal) / max) * 100);
                  const share = (Math.abs(bal) / groupTotal) * 100;
                  return (
                    <li key={r.journal_id} className="rounded-lg px-2.5 py-1.5 transition-colors hover:bg-surface-2/60">
                      <div className="flex items-baseline justify-between gap-3">
                        <span className="flex min-w-0 items-baseline gap-1.5">
                          <span className="truncate text-body text-fg">{r.journal_name}</span>
                          <span className="shrink-0 truncate text-meta text-muted">{r.ledger_name}</span>
                        </span>
                        <span className="flex shrink-0 items-baseline gap-1.5">
                          <span className="text-micro tabular-nums text-muted">{share.toFixed(0)}%</span>
                          <span className={`text-body font-medium tabular-nums ${neg ? "text-danger" : "text-fg"}`}>
                            {money(bal)}
                          </span>
                        </span>
                      </div>
                      <div className="mt-1.5 h-0.75 overflow-hidden rounded-full bg-surface-2">
                        <div
                          className={`h-full rounded-full transition-[width] duration-500 ${neg ? "bg-danger/70" : "bg-primary/70"}`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </li>
                  );
                })}
              </ul>
            </Panel>
          );
        })
      )}
    </div>
  );
}
