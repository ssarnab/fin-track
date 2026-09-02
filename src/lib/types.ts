export type ComponentKind =
  | "asset"
  | "liability"
  | "equity"
  | "income"
  | "expense";

// Asset/liability journals are real "wallets" — checking their balance before
// an entry is useful. Income/expense/equity are flow categories, not
// balances you'd check before spending.
export function isWalletKind(kind: ComponentKind): boolean {
  return kind === "asset" || kind === "liability";
}

export type Component = {
  id: number;
  uid: string;
  name: string;
  kind: ComponentKind;
  sort_order: number;
  created_at: string;
};

export type Ledger = {
  id: number;
  uid: string;
  component_id: number;
  name: string;
  sort_order: number;
  created_at: string;
};

export type Journal = {
  id: number;
  uid: string;
  ledger_id: number;
  name: string;
  is_active: boolean;
  sort_order: number;
  created_at: string;
};

export type Transaction = {
  id: number;
  uid: string;
  txn_date: string; // YYYY-MM-DD
  debit_journal_id: number;
  credit_journal_id: number;
  amount: number;
  remarks: string | null;
  created_at: string;
};

export type JournalBalance = {
  journal_id: number;
  uid: string;
  journal_name: string;
  ledger_id: number;
  ledger_name: string;
  component_id: number;
  component_name: string;
  component_kind: ComponentKind;
  debit_total: number;
  credit_total: number;
  balance: number;
};

export const COMPONENT_KINDS: { value: ComponentKind; label: string }[] = [
  { value: "asset", label: "Asset" },
  { value: "liability", label: "Liability" },
  { value: "equity", label: "Equity" },
  { value: "income", label: "Income" },
  { value: "expense", label: "Expense" },
];

// ---- Routine (daily checklist / habit tracker) -----------------------------

export type DayType = "workday" | "offday";

export type RoutineItem = {
  id: number;
  uid: string;
  day_type: DayType;
  title: string;
  time_label: string | null; // superseded by start_time/end_time; unused by the UI now
  start_time: string | null; // "HH:MM" — the block's planned start
  end_time: string | null; // "HH:MM" — the block's planned end (may wrap past midnight)
  category: string | null; // groups blocks for the hours/percent-by-category rollup, e.g. "Work", "Exercise"
  sort_order: number;
  created_at: string;
};

export type RoutineDay = {
  uid: string;
  date: string; // YYYY-MM-DD
  day_type: DayType;
  // Minutes to shift the whole day's planned schedule by (+later, -earlier)
  // — e.g. "going to sleep an hour late today", set in advance. Doesn't
  // change any block's duration, just when it's planned to happen.
  shift_minutes: number;
};

export type RoutineCheck = {
  uid: string;
  date: string; // YYYY-MM-DD
  item_id: number;
  done: boolean;
  done_at: string | null;
  // What was actually logged for the block — "% achieved" is computed from
  // how much of [actual_start, actual_end) overlaps the item's planned
  // duration. Null means nothing was logged (0%).
  actual_start: string | null;
  actual_end: string | null;
  // Free-text context — what happened instead, when it wasn't fully met.
  note: string | null;
  // This block doesn't apply today — a one-off skip, not a template edit.
  // Excluded from both the planned and actual totals for the day (not
  // counted as missed either).
  excluded: boolean;
};
