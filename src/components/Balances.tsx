"use client";

import { useCallback, useEffect, useState } from "react";
import { listBalances } from "@/lib/transactions";
import { useRealtime } from "@/lib/useRealtime";
import { Card, money } from "@/components/ui";
import type { JournalBalance } from "@/lib/types";

type Group = {
  component_name: string;
  component_kind: string;
  total: number;
  rows: JournalBalance[];
};

export default function Balances() {
  const [rows, setRows] = useState<JournalBalance[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  if (loading) return <p className="text-muted">Loading balances…</p>;
  if (error)
    return (
      <div className="rounded-xl border border-danger/40 bg-danger/10 px-4 py-3 text-danger">
        {error}
      </div>
    );

  // Group by component, preserving the query's ordering.
  const groups: Group[] = [];
  for (const r of rows) {
    let g = groups.find((x) => x.component_name === r.component_name);
    if (!g) {
      g = {
        component_name: r.component_name,
        component_kind: r.component_kind,
        total: 0,
        rows: [],
      };
      groups.push(g);
    }
    g.rows.push(r);
    g.total += Number(r.balance);
  }

  if (rows.length === 0) {
    return <p className="text-muted">No accounts yet. Add some under Accounts.</p>;
  }

  return (
    <div className="space-y-4">
      {groups.map((g) => (
        <Card key={g.component_name} className="p-0 overflow-hidden">
          <div className="flex items-center justify-between border-b border-border bg-surface-2 px-5 py-3">
            <div>
              <h2 className="font-semibold text-fg">{g.component_name}</h2>
              <span className="text-xs capitalize text-muted">{g.component_kind}</span>
            </div>
            <span className={`font-mono font-semibold ${g.total < 0 ? "text-danger" : "text-fg"}`}>
              {money(g.total)}
            </span>
          </div>
          <div className="divide-y divide-border">
            {g.rows.map((r) => (
              <div
                key={r.journal_id}
                className="flex items-center justify-between px-5 py-2.5"
              >
                <div>
                  <span className="text-fg">{r.journal_name}</span>
                  <span className="ml-2 text-xs text-muted">{r.ledger_name}</span>
                </div>
                <span
                  className={`font-mono text-sm ${
                    Number(r.balance) < 0 ? "text-danger" : "text-fg"
                  }`}
                >
                  {money(Number(r.balance))}
                </span>
              </div>
            ))}
          </div>
        </Card>
      ))}
    </div>
  );
}
