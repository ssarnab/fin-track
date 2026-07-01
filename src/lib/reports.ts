import type { JournalBalance, Transaction, ComponentKind, Journal } from "@/lib/types";

export type Totals = {
  assets: number;
  liabilities: number;
  netWorth: number;
  income: number;
  expense: number;
};

export type Slice = { name: string; value: number };
export type MonthPoint = { month: string; income: number; expense: number };
export type TrendPoint = { date: string; value: number };

export function computeTotals(balances: JournalBalance[]): Totals {
  let assets = 0,
    liabilities = 0,
    income = 0,
    expense = 0;
  for (const b of balances) {
    const v = Number(b.balance);
    switch (b.component_kind) {
      case "asset":
        assets += v;
        break;
      case "liability":
        liabilities += v;
        break;
      case "income":
        income += v;
        break;
      case "expense":
        expense += v;
        break;
    }
  }
  return { assets, liabilities, netWorth: assets - liabilities, income, expense };
}

/** Group balances of a given kind into pie slices (dropping zero/negatives). */
export function breakdownByKind(
  balances: JournalBalance[],
  kind: ComponentKind,
): Slice[] {
  return balances
    .filter((b) => b.component_kind === kind && Number(b.balance) > 0)
    .map((b) => ({ name: b.journal_name, value: Number(b.balance) }))
    .sort((a, b) => b.value - a.value);
}

type KindMap = Map<number, ComponentKind>;

export function journalKindMap(
  journals: Journal[],
  ledgerToComponentKind: Map<number, ComponentKind>,
): KindMap {
  const m: KindMap = new Map();
  for (const j of journals) {
    const kind = ledgerToComponentKind.get(j.ledger_id);
    if (kind) m.set(j.id, kind);
  }
  return m;
}

const MONTH_LABELS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** Income vs expense per month for the last `months` months. */
export function monthlyIncomeExpense(
  txns: Transaction[],
  kinds: KindMap,
  months = 6,
): MonthPoint[] {
  const now = new Date();
  const buckets: MonthPoint[] = [];
  const index = new Map<string, MonthPoint>();
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${d.getMonth()}`;
    const point = { month: MONTH_LABELS[d.getMonth()], income: 0, expense: 0 };
    buckets.push(point);
    index.set(key, point);
  }

  for (const t of txns) {
    const d = new Date(t.txn_date);
    const key = `${d.getFullYear()}-${d.getMonth()}`;
    const point = index.get(key);
    if (!point) continue;
    const amt = Number(t.amount);
    if (kinds.get(t.credit_journal_id) === "income") point.income += amt;
    if (kinds.get(t.debit_journal_id) === "expense") point.expense += amt;
  }
  return buckets;
}

/** Cumulative net-worth trend (asset − liability effect), aggregated by day. */
export function netWorthTrend(txns: Transaction[], kinds: KindMap): TrendPoint[] {
  const perDay = new Map<string, number>();
  for (const t of txns) {
    const amt = Number(t.amount);
    const kd = kinds.get(t.debit_journal_id);
    const kc = kinds.get(t.credit_journal_id);
    let assetDelta = 0;
    let liabDelta = 0;
    if (kd === "asset") assetDelta += amt;
    if (kc === "asset") assetDelta -= amt;
    if (kd === "liability") liabDelta -= amt;
    if (kc === "liability") liabDelta += amt;
    const delta = assetDelta - liabDelta;
    if (delta === 0) continue;
    perDay.set(t.txn_date, (perDay.get(t.txn_date) ?? 0) + delta);
  }

  const days = [...perDay.keys()].sort();
  let running = 0;
  return days.map((date) => {
    running += perDay.get(date)!;
    return { date, value: running };
  });
}
