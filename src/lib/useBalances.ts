"use client";

import { useCallback, useEffect, useState } from "react";
import { listBalances } from "@/lib/transactions";
import { useRealtime } from "@/lib/useRealtime";
import type { JournalBalance } from "@/lib/types";

export function useBalances() {
  const [balances, setBalances] = useState<JournalBalance[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      setBalances(await listBalances());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);
  // Structural renames (journal/ledger/component) are rare and usually fire
  // alongside their own realtime listener elsewhere (e.g. useAccountTree) —
  // subscribing to them here too just doubles the channel for every edit.
  useRealtime(["transactions"], load);

  return { balances, loading };
}
