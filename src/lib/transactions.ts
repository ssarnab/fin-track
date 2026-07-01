import { supabase } from "@/lib/supabase";
import type { Transaction, JournalBalance } from "@/lib/types";

export type NewTransaction = {
  txn_date: string; // YYYY-MM-DD
  debit_journal_id: number; // In
  credit_journal_id: number; // Out
  amount: number;
  remarks?: string | null;
};

export async function createTransaction(t: NewTransaction) {
  const { data, error } = await supabase
    .from("transactions")
    .insert({
      txn_date: t.txn_date,
      debit_journal_id: t.debit_journal_id,
      credit_journal_id: t.credit_journal_id,
      amount: t.amount,
      remarks: t.remarks?.trim() || null,
    })
    .select()
    .single();
  if (error) throw error;
  return data as Transaction;
}

export async function deleteTransaction(id: number) {
  const { error } = await supabase.from("transactions").delete().eq("id", id);
  if (error) throw error;
}

export async function listTransactions(limit = 200): Promise<Transaction[]> {
  const { data, error } = await supabase
    .from("transactions")
    .select("*")
    .order("txn_date", { ascending: false })
    .order("id", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data ?? [];
}

export async function listBalances(): Promise<JournalBalance[]> {
  const { data, error } = await supabase
    .from("journal_balances")
    .select("*")
    .order("component_name")
    .order("ledger_name")
    .order("journal_name");
  if (error) throw error;
  return (data ?? []) as JournalBalance[];
}
