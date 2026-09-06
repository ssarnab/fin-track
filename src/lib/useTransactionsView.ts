"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { listTransactions } from "@/lib/transactions";
import { listComponents, listLedgers, listJournals } from "@/lib/accounts";
import { useRealtime } from "@/lib/useRealtime";
import { buildJournalMeta, journalKindMap, type JournalMeta } from "@/lib/reports";
import type { Transaction, Component, Ledger, Journal, ComponentKind } from "@/lib/types";

/** Kept as an alias so callers keep reading naturally; the shape is the
 * shared one the analytics helpers take. */
export type JournalInfo = JournalMeta;

export function useTransactionsView(limit = 2000) {
  const [txns, setTxns] = useState<Transaction[]>([]);
  const [components, setComponents] = useState<Component[]>([]);
  const [ledgers, setLedgers] = useState<Ledger[]>([]);
  const [journals, setJournals] = useState<Journal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const [t, c, l, j] = await Promise.all([
        listTransactions(limit),
        listComponents(),
        listLedgers(),
        listJournals(),
      ]);
      setTxns(t);
      setComponents(c);
      setLedgers(l);
      setJournals(j);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, [limit]);

  useEffect(() => {
    load();
  }, [load]);
  useRealtime(["transactions", "journal", "ledger", "component"], load);

  const journalInfo = useMemo(
    () => buildJournalMeta(components, ledgers, journals),
    [components, ledgers, journals],
  );

  // Journal → kind, for the analytics helpers that only need the kind.
  const kinds = useMemo(() => {
    const componentKind = new Map<number, ComponentKind>(components.map((c) => [c.id, c.kind]));
    const ledgerKind = new Map<number, ComponentKind>();
    for (const l of ledgers) {
      const k = componentKind.get(l.component_id);
      if (k) ledgerKind.set(l.id, k);
    }
    return journalKindMap(journals, ledgerKind);
  }, [components, ledgers, journals]);

  return { txns, journals, journalInfo, kinds, loading, error, reload: load };
}
