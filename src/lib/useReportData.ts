"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { listBalances, listTransactions } from "@/lib/transactions";
import { listComponents, listLedgers, listJournals } from "@/lib/accounts";
import { useRealtime } from "@/lib/useRealtime";
import {
  computeTotals,
  breakdownByKind,
  monthlyIncomeExpense,
  netWorthTrend,
  journalKindMap,
} from "@/lib/reports";
import type {
  JournalBalance,
  Transaction,
  Component,
  Ledger,
  Journal,
  ComponentKind,
} from "@/lib/types";

export function useReportData() {
  const [balances, setBalances] = useState<JournalBalance[]>([]);
  const [txns, setTxns] = useState<Transaction[]>([]);
  const [components, setComponents] = useState<Component[]>([]);
  const [ledgers, setLedgers] = useState<Ledger[]>([]);
  const [journals, setJournals] = useState<Journal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const [b, t, c, l, j] = await Promise.all([
        listBalances(),
        listTransactions(1000),
        listComponents(),
        listLedgers(),
        listJournals(),
      ]);
      setBalances(b);
      setTxns(t);
      setComponents(c);
      setLedgers(l);
      setJournals(j);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load report");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);
  useRealtime(["transactions", "journal", "ledger", "component"], load);

  const data = useMemo(() => {
    const componentKind = new Map<number, ComponentKind>(
      components.map((c) => [c.id, c.kind]),
    );
    const ledgerKind = new Map<number, ComponentKind>();
    for (const l of ledgers) {
      const k = componentKind.get(l.component_id);
      if (k) ledgerKind.set(l.id, k);
    }
    const kinds = journalKindMap(journals, ledgerKind);

    return {
      totals: computeTotals(balances),
      expenseSlices: breakdownByKind(balances, "expense"),
      assetSlices: breakdownByKind(balances, "asset"),
      monthly: monthlyIncomeExpense(txns, kinds, 6),
      trend: netWorthTrend(txns, kinds),
      txnCount: txns.length,
    };
  }, [balances, txns, components, ledgers, journals]);

  return { ...data, loading, error, reload: load };
}
