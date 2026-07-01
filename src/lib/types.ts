export type ComponentKind =
  | "asset"
  | "liability"
  | "equity"
  | "income"
  | "expense";

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
