"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { listTransactions } from "@/lib/transactions";
import { listComponents, listLedgers, listJournals } from "@/lib/accounts";
import { useRealtime } from "@/lib/useRealtime";
import type {
  Transaction,
  Component,
  Ledger,
  Journal,
  ComponentKind,
} from "@/lib/types";

export type JournalInfo = {
  id: number;
  name: string;
  ledger: string;
  component: string;
  kind: ComponentKind;
};

export function useTransactionsView() {
  const [txns, setTxns] = useState<Transaction[]>([]);
  const [components, setComponents] = useState<Component[]>([]);
  const [ledgers, setLedgers] = useState<Ledger[]>([]);
  const [journals, setJournals] = useState<Journal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const [t, c, l, j] = await Promise.all([
        listTransactions(2000),
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
  }, []);

  useEffect(() => {
    load();
  }, [load]);
  useRealtime(["transactions", "journal", "ledger", "component"], load);

  const journalInfo = useMemo(() => {
    const comp = new Map(components.map((c) => [c.id, c]));
    const led = new Map(ledgers.map((l) => [l.id, l]));
    const m = new Map<number, JournalInfo>();
    for (const j of journals) {
      const l = led.get(j.ledger_id);
      const c = l ? comp.get(l.component_id) : undefined;
      m.set(j.id, {
        id: j.id,
        name: j.name,
        ledger: l?.name ?? "—",
        component: c?.name ?? "—",
        kind: c?.kind ?? "asset",
      });
    }
    return m;
  }, [components, ledgers, journals]);

  return { txns, journals, journalInfo, loading, error, reload: load };
}
