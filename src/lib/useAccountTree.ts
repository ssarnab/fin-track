"use client";

import { useCallback, useEffect, useState } from "react";
import {
  listComponents,
  listLedgers,
  listJournals,
  ensureDefaultComponents,
} from "@/lib/accounts";
import { useRealtime } from "@/lib/useRealtime";
import type { Component, Ledger, Journal } from "@/lib/types";

export type JournalNode = Journal;
export type LedgerNode = Ledger & { journals: JournalNode[] };
export type ComponentNode = Component & { ledgers: LedgerNode[] };

export function useAccountTree(seed = false) {
  const [components, setComponents] = useState<Component[]>([]);
  const [ledgers, setLedgers] = useState<Ledger[]>([]);
  const [journals, setJournals] = useState<Journal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      if (seed) await ensureDefaultComponents();
      const [c, l, j] = await Promise.all([
        listComponents(),
        listLedgers(),
        listJournals(),
      ]);
      setComponents(c);
      setLedgers(l);
      setJournals(j);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load accounts");
    } finally {
      setLoading(false);
    }
  }, [seed]);

  useEffect(() => {
    load();
  }, [load]);

  useRealtime(["component", "ledger", "journal"], load);

  // Build nested tree.
  const tree: ComponentNode[] = components.map((c) => ({
    ...c,
    ledgers: ledgers
      .filter((l) => l.component_id === c.id)
      .map((l) => ({
        ...l,
        journals: journals.filter((j) => j.ledger_id === l.id),
      })),
  }));

  return { components, ledgers, journals, tree, loading, error, reload: load };
}
