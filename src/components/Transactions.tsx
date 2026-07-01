"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { listTransactions, deleteTransaction } from "@/lib/transactions";
import { useAccountTree } from "@/lib/useAccountTree";
import { useRealtime } from "@/lib/useRealtime";
import { Card, money } from "@/components/ui";
import type { Transaction } from "@/lib/types";

export default function Transactions() {
  const { journals } = useAccountTree();
  const [rows, setRows] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setRows(await listTransactions());
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load transactions");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);
  useRealtime(["transactions"], load);

  const nameOf = useMemo(() => {
    const m = new Map<number, string>();
    journals.forEach((j) => m.set(j.id, j.name));
    return (id: number) => m.get(id) ?? `#${id}`;
  }, [journals]);

  async function remove(id: number) {
    if (!window.confirm("Delete this transaction?")) return;
    try {
      await deleteTransaction(id);
    } catch (e) {
      alert(e instanceof Error ? e.message : "Failed");
    }
  }

  if (loading) return <p className="text-muted">Loading transactions…</p>;
  if (error)
    return (
      <div className="rounded-xl border border-danger/40 bg-danger/10 px-4 py-3 text-danger">
        {error}
      </div>
    );
  if (rows.length === 0)
    return <p className="text-muted">No transactions yet. Add one from Home.</p>;

  return (
    <Card className="p-0 overflow-hidden">
      <div className="divide-y divide-border">
        {rows.map((t) => (
          <div key={t.id} className="group flex items-center gap-3 px-4 py-3">
            <div className="w-20 shrink-0 text-xs text-muted">{t.txn_date}</div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 text-sm">
                <span className="truncate text-success">{nameOf(t.debit_journal_id)}</span>
                <span className="text-muted">←</span>
                <span className="truncate text-danger">{nameOf(t.credit_journal_id)}</span>
              </div>
              {t.remarks && <div className="truncate text-xs text-muted">{t.remarks}</div>}
            </div>
            <div className="shrink-0 font-mono text-sm text-fg">{money(Number(t.amount))}</div>
            <button
              onClick={() => remove(t.id)}
              title="Delete"
              className="shrink-0 rounded p-1 text-muted opacity-0 transition-opacity hover:text-danger group-hover:opacity-100"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m2 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
              </svg>
            </button>
          </div>
        ))}
      </div>
    </Card>
  );
}
