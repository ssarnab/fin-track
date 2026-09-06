import { toISO } from "@/lib/date";
import type { JournalBalance, Transaction, ComponentKind, Journal, Component, Ledger } from "@/lib/types";

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

/** Caps a (already-sorted-desc) slice list to `max` entries, bucketing the
 * rest into "Other" — keeps a pie chart's legend from overflowing when
 * someone has dozens of categories. */
export function topSlices(slices: Slice[], max = 5): Slice[] {
  if (slices.length <= max) return slices;
  const top = slices.slice(0, max);
  const rest = slices.slice(max).reduce((s, x) => s + x.value, 0);
  return rest > 0 ? [...top, { name: "Other", value: rest }] : top;
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
    const delta = netWorthDelta(t, kinds);
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

// ---------------------------------------------------------------------------
// Shared analytics — the dashboard and the report page were each deriving
// their own totals and groupings from the same rows.
// ---------------------------------------------------------------------------

/** Everything the UI needs to label a journal, without re-walking the tree. */
export type JournalMeta = {
  id: number;
  name: string;
  ledger: string;
  component: string;
  kind: ComponentKind;
};

export function buildJournalMeta(
  components: Component[],
  ledgers: Ledger[],
  journals: Journal[],
): Map<number, JournalMeta> {
  const comp = new Map(components.map((c) => [c.id, c]));
  const led = new Map(ledgers.map((l) => [l.id, l]));
  const m = new Map<number, JournalMeta>();
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
}

/** Calendar month `offset` months back from today, as local ISO dates. */
export function monthRange(offset = 0): { from: string; to: string; label: string } {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth() - offset, 1);
  const end = new Date(now.getFullYear(), now.getMonth() - offset + 1, 0);
  return {
    from: toISO(start),
    to: toISO(end),
    label: `${MONTH_LABELS[start.getMonth()]} ${start.getFullYear()}`,
  };
}

export type FlowTotals = { income: number; expense: number; net: number; count: number };

/** Income/expense moved within an optional date window. */
export function flowTotals(
  txns: Transaction[],
  kinds: KindMap,
  from?: string,
  to?: string,
): FlowTotals {
  let income = 0;
  let expense = 0;
  let count = 0;
  for (const t of txns) {
    if (from && t.txn_date < from) continue;
    if (to && t.txn_date > to) continue;
    count++;
    const amt = Number(t.amount);
    if (kinds.get(t.credit_journal_id) === "income") income += amt;
    if (kinds.get(t.debit_journal_id) === "expense") expense += amt;
  }
  return { income, expense, net: income - expense, count };
}

/** Percent change from `prev` to `curr`. Null when there is no baseline to
 * compare against — "+∞%" against a zero month is noise, not insight. */
export function pctChange(curr: number, prev: number): number | null {
  if (!prev) return null;
  return ((curr - prev) / Math.abs(prev)) * 100;
}

/** Share of income kept. Null when nothing came in that period. */
export function savingsRate(f: FlowTotals): number | null {
  if (f.income <= 0) return null;
  return (f.net / f.income) * 100;
}

/** Which level of the account tree a breakdown rolls up to. The same rows
 * regrouped — "Groceries", or its group "Food", or its category "Expense". */
export type GroupBy = "account" | "group" | "category";

export const GROUP_BY_LABEL: Record<GroupBy, string> = {
  account: "Account",
  group: "Group",
  category: "Category",
};

/** Money in (or out) per account/group/category over an optional window.
 * Expense rows are keyed by where the money landed (debit), income rows by
 * where it came from (credit). */
export function groupFlow(
  txns: Transaction[],
  meta: Map<number, JournalMeta>,
  want: "expense" | "income",
  by: GroupBy = "account",
  from?: string,
  to?: string,
): Slice[] {
  const keyOf = (m: JournalMeta) => (by === "account" ? m.name : by === "group" ? m.ledger : m.component);
  const totals = new Map<string, number>();
  for (const t of txns) {
    if (from && t.txn_date < from) continue;
    if (to && t.txn_date > to) continue;
    const m = meta.get(want === "expense" ? t.debit_journal_id : t.credit_journal_id);
    if (!m || m.kind !== want) continue;
    const k = keyOf(m);
    totals.set(k, (totals.get(k) ?? 0) + Number(t.amount));
  }
  return [...totals.entries()]
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);
}

/** What one transaction does to net worth: assets up, liabilities down. */
function netWorthDelta(t: Transaction, kinds: KindMap): number {
  const amt = Number(t.amount);
  const kd = kinds.get(t.debit_journal_id);
  const kc = kinds.get(t.credit_journal_id);
  let assets = 0;
  let liabs = 0;
  if (kd === "asset") assets += amt;
  if (kc === "asset") assets -= amt;
  if (kd === "liability") liabs -= amt;
  if (kc === "liability") liabs += amt;
  return assets - liabs;
}

/** Net-worth movement inside a window — the delta behind "▲ ৳4,200 this month". */
export function netWorthChange(txns: Transaction[], kinds: KindMap, from?: string, to?: string): number {
  let total = 0;
  for (const t of txns) {
    if (from && t.txn_date < from) continue;
    if (to && t.txn_date > to) continue;
    total += netWorthDelta(t, kinds);
  }
  return total;
}
