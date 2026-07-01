import { supabase } from "@/lib/supabase";
import type { Component, Ledger, Journal, ComponentKind } from "@/lib/types";

// Rows carry `uid` via a Postgres default (current_uid()), so inserts omit it.

// ---- Components -----------------------------------------------------------
export async function listComponents(): Promise<Component[]> {
  const { data, error } = await supabase
    .from("component")
    .select("*")
    .order("sort_order")
    .order("name");
  if (error) throw error;
  return data ?? [];
}

export async function createComponent(name: string, kind: ComponentKind) {
  const { data, error } = await supabase
    .from("component")
    .insert({ name: name.trim(), kind })
    .select()
    .single();
  if (error) throw error;
  return data as Component;
}

export async function renameComponent(id: number, name: string) {
  const { error } = await supabase
    .from("component")
    .update({ name: name.trim() })
    .eq("id", id);
  if (error) throw error;
}

export async function deleteComponent(id: number) {
  const { error } = await supabase.from("component").delete().eq("id", id);
  if (error) throw error;
}

// ---- Ledgers --------------------------------------------------------------
export async function listLedgers(): Promise<Ledger[]> {
  const { data, error } = await supabase
    .from("ledger")
    .select("*")
    .order("sort_order")
    .order("name");
  if (error) throw error;
  return data ?? [];
}

export async function createLedger(componentId: number, name: string) {
  const { data, error } = await supabase
    .from("ledger")
    .insert({ component_id: componentId, name: name.trim() })
    .select()
    .single();
  if (error) throw error;
  return data as Ledger;
}

export async function renameLedger(id: number, name: string) {
  const { error } = await supabase
    .from("ledger")
    .update({ name: name.trim() })
    .eq("id", id);
  if (error) throw error;
}

export async function deleteLedger(id: number) {
  const { error } = await supabase.from("ledger").delete().eq("id", id);
  if (error) throw error;
}

// ---- Journals -------------------------------------------------------------
export async function listJournals(): Promise<Journal[]> {
  const { data, error } = await supabase
    .from("journal")
    .select("*")
    .order("sort_order")
    .order("name");
  if (error) throw error;
  return data ?? [];
}

export async function createJournal(ledgerId: number, name: string) {
  const { data, error } = await supabase
    .from("journal")
    .insert({ ledger_id: ledgerId, name: name.trim() })
    .select()
    .single();
  if (error) throw error;
  return data as Journal;
}

export async function renameJournal(id: number, name: string) {
  const { error } = await supabase
    .from("journal")
    .update({ name: name.trim() })
    .eq("id", id);
  if (error) throw error;
}

export async function setJournalActive(id: number, isActive: boolean) {
  const { error } = await supabase
    .from("journal")
    .update({ is_active: isActive })
    .eq("id", id);
  if (error) throw error;
}

export async function deleteJournal(id: number) {
  const { error } = await supabase.from("journal").delete().eq("id", id);
  if (error) throw error;
}

// ---- First-run seed -------------------------------------------------------
const DEFAULT_COMPONENTS: { name: string; kind: ComponentKind; sort: number }[] = [
  { name: "Asset", kind: "asset", sort: 1 },
  { name: "Liability", kind: "liability", sort: 2 },
  { name: "Equity", kind: "equity", sort: 3 },
  { name: "Income", kind: "income", sort: 4 },
  { name: "Expense", kind: "expense", sort: 5 },
];

/** Seeds the five standard components the first time a user has none. */
export async function ensureDefaultComponents(): Promise<void> {
  const { count, error } = await supabase
    .from("component")
    .select("id", { count: "exact", head: true });
  if (error) throw error;
  if ((count ?? 0) > 0) return;

  const { error: insErr } = await supabase.from("component").insert(
    DEFAULT_COMPONENTS.map((c) => ({ name: c.name, kind: c.kind, sort_order: c.sort })),
  );
  // Ignore unique violations from a concurrent first-run.
  if (insErr && insErr.code !== "23505") throw insErr;
}
