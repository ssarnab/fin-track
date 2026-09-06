"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useAccountTree } from "@/lib/useAccountTree";
import { useBalances } from "@/lib/useBalances";
import { useTransactionsView } from "@/lib/useTransactionsView";
import { createTransaction, deleteTransaction } from "@/lib/transactions";
import { Button, Panel, Field, Input, PageTitle, money } from "@/components/ui";
import JournalSelect from "@/components/JournalSelect";
import { todayISO, addDays } from "@/lib/date";

/** Shows what a balance becomes if this entry is saved — the number people
 * actually want before committing, and the app already has every input. */
function BalancePreview({
  before,
  delta,
}: {
  before: number | undefined;
  delta: number;
}) {
  if (before === undefined || !delta) return null;
  const after = before + delta;
  return (
    <p className="-mt-1 pr-1 text-right text-meta tabular-nums text-muted">
      {money(before)} <span className="text-muted">→</span>{" "}
      <span className={after < 0 ? "font-medium text-danger" : "font-medium text-fg"}>{money(after)}</span>
    </p>
  );
}

export default function EntryForm() {
  const { tree, journals, loading } = useAccountTree(true);
  const { balances, reload: reloadBalances } = useBalances();
  // Only what the "recent" list renders — this page has no use for the full
  // history the report page pulls.
  const { txns, journalInfo, reload: reloadTxns } = useTransactionsView(8);

  const balanceByJournal = useMemo(
    () => new Map(balances.map((b) => [b.journal_id, Number(b.balance)])),
    [balances],
  );

  const [inJournal, setInJournal] = useState<number | "">("");
  const [outJournal, setOutJournal] = useState<number | "">("");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(todayISO());
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  const hasJournals = journals.length > 0;
  const sameAccount = inJournal !== "" && inJournal === outJournal;
  const amt = Number(amount) || 0;

  const canSave = useMemo(
    () => inJournal !== "" && outJournal !== "" && inJournal !== outJournal && amt > 0 && !!date,
    [inJournal, outJournal, amt, date],
  );

  function swap() {
    setInJournal(outJournal);
    setOutJournal(inJournal);
  }

  async function save() {
    if (!canSave) return;
    setBusy(true);
    setMsg(null);
    try {
      await createTransaction({
        txn_date: date,
        debit_journal_id: Number(inJournal),
        credit_journal_id: Number(outJournal),
        amount: amt,
        remarks: note,
      });
      setMsg({ type: "ok", text: `Saved ${money(amt)}` });
      setAmount("");
      setNote("");
      // Don't wait on the realtime round-trip — the picker's balances and the
      // recent list should reflect this entry the instant it's saved.
      reloadBalances();
      reloadTxns();
    } catch (e) {
      setMsg({ type: "err", text: e instanceof Error ? e.message : "Save failed" });
    } finally {
      setBusy(false);
    }
  }

  /** Loads a past entry back into the form — most entries are repeats of one
   * you already made, so retyping the pair every time is busywork. */
  function repeat(id: number) {
    const t = txns.find((x) => x.id === id);
    if (!t) return;
    setInJournal(t.debit_journal_id);
    setOutJournal(t.credit_journal_id);
    setAmount(String(Number(t.amount)));
    setNote(t.remarks ?? "");
    setDate(todayISO());
    setMsg(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function removeEntry(id: number) {
    if (!window.confirm("Delete this entry?")) return;
    try {
      await deleteTransaction(id);
      reloadTxns();
      reloadBalances();
    } catch (e) {
      setMsg({ type: "err", text: e instanceof Error ? e.message : "Delete failed" });
    }
  }

  const recent = txns.slice(0, 5);

  return (
    <div className="mx-auto max-w-xl space-y-3">
      <PageTitle
        title="New entry"
        subtitle="Money moves out of one account and into another."
        actions={
          <div className="flex gap-1">
            {/* Dating an entry is the most-changed field after the amount. */}
            {[
              { label: "Today", value: todayISO() },
              { label: "Yesterday", value: addDays(todayISO(), -1) },
            ].map((d) => (
              <button
                key={d.label}
                onClick={() => setDate(d.value)}
                className={`rounded-lg px-2.5 py-1 text-meta font-medium transition-colors ${
                  date === d.value ? "bg-primary/12 text-primary" : "bg-surface-2 text-muted hover:text-fg"
                }`}
              >
                {d.label}
              </button>
            ))}
          </div>
        }
      />

      {!loading && !hasJournals && (
        <div className="rounded-xl border border-warning/40 bg-warning/10 px-3.5 py-2.5 text-body text-fg">
          You have no accounts yet. Add some in{" "}
          <Link href="/accounts" className="font-medium text-primary underline underline-offset-2">
            Accounts
          </Link>{" "}
          first.
        </div>
      )}

      <Panel bodyPad="p-3">
        <div
          className="space-y-2"
          onKeyDown={(e) => {
            // Ctrl/Cmd+Enter saves from anywhere in the form.
            if ((e.metaKey || e.ctrlKey) && e.key === "Enter") save();
          }}
        >
          {/* Out → In, in that reading order, with the direction drawn between
              them — "which box was debit again" is the one thing people get
              wrong in a double-entry form. */}
          <Field label="Out · money leaves">
            <JournalSelect
              tree={tree}
              value={outJournal}
              onChange={setOutJournal}
              placeholder="Choose the account it comes from"
              balanceByJournal={balanceByJournal}
            />
          </Field>
          <BalancePreview before={outJournal === "" ? undefined : balanceByJournal.get(Number(outJournal))} delta={-amt} />

          <div className="flex items-center gap-2">
            <button
              onClick={swap}
              disabled={inJournal === "" && outJournal === ""}
              title="Swap the two accounts"
              className="grid h-6 w-6 shrink-0 place-items-center rounded-md text-primary transition-colors hover:bg-surface-2 disabled:opacity-30"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M7 4v16m0 0-3-3m3 3 3-3M17 20V4m0 0-3 3m3-3 3 3" />
              </svg>
            </button>
            <span className="h-px flex-1 bg-border" />
          </div>

          <Field label="In · money arrives">
            <JournalSelect
              tree={tree}
              value={inJournal}
              onChange={setInJournal}
              placeholder="Choose the account it goes to"
              balanceByJournal={balanceByJournal}
            />
          </Field>
          <BalancePreview before={inJournal === "" ? undefined : balanceByJournal.get(Number(inJournal))} delta={amt} />

          {sameAccount && <p className="text-body text-danger">In and Out must be different accounts.</p>}

          <div className="grid gap-2.5 sm:grid-cols-2">
            <Field label="Amount">
              <Input
                type="number"
                inputMode="decimal"
                min="0"
                step="0.01"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                text="text-base"
                className="font-semibold tabular-nums"
              />
            </Field>
            <Field label="Date">
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </Field>
          </div>

          <Field label="Note">
            <Input placeholder="Optional" value={note} maxLength={100} onChange={(e) => setNote(e.target.value)} />
          </Field>

          <div className="flex min-h-9 items-center justify-between gap-3 border-t border-border pt-3">
            {/* min-h on the row, not a transparent placeholder string — the
                layout still holds steady, without a screen reader announcing
                filler text. */}
            <p aria-live="polite" className={`text-body ${msg?.type === "err" ? "text-danger" : "text-success"}`}>
              {msg?.text}
            </p>
            <div className="flex items-center gap-2">
              <kbd className="hidden rounded border border-border bg-surface-2 px-1.5 py-0.5 text-micro text-muted sm:block">
                Ctrl↵
              </kbd>
              <Button onClick={save} disabled={!canSave || busy} pad="px-6 py-2">
                {busy ? "Saving…" : "Save entry"}
              </Button>
            </div>
          </div>
        </div>
      </Panel>

      {recent.length > 0 && (
        <Panel
          title="Recent entries"
          subtitle="Click repeat to load one back into the form"
          actions={
            <Link href="/report" className="text-meta font-medium text-primary hover:underline">
              View all
            </Link>
          }
          bodyPad="p-1.5"
        >
          <ul>
            {recent.map((t) => (
              <li
                key={t.id}
                className="group flex items-center gap-2 rounded-lg px-2.5 py-1.5 transition-colors hover:bg-surface-2/60"
              >
                <span className="w-12 shrink-0 text-meta whitespace-nowrap tabular-nums text-muted">{t.txn_date.slice(5)}</span>
                <span className="flex min-w-0 flex-1 items-center gap-1.5 text-body">
                  <span className="truncate text-muted">{journalInfo.get(t.credit_journal_id)?.name ?? "—"}</span>
                  <span className="shrink-0 text-muted">→</span>
                  <span className="truncate text-fg">{journalInfo.get(t.debit_journal_id)?.name ?? "—"}</span>
                </span>
                <span className="shrink-0 text-body font-medium tabular-nums text-fg">{money(Number(t.amount))}</span>
                <span className="flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
                  <button
                    onClick={() => repeat(t.id)}
                    title="Repeat this entry"
                    aria-label="Repeat this entry"
                    className="grid h-6 w-6 place-items-center rounded-md text-muted transition-colors hover:bg-surface-2 hover:text-primary"
                  >
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M3 12a9 9 0 1 0 3-6.7L3 8m0-5v5h5" />
                    </svg>
                  </button>
                  <button
                    onClick={() => removeEntry(t.id)}
                    title="Delete this entry"
                    aria-label="Delete this entry"
                    className="grid h-6 w-6 place-items-center rounded-md text-muted transition-colors hover:bg-danger/10 hover:text-danger"
                  >
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m2 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
                    </svg>
                  </button>
                </span>
              </li>
            ))}
          </ul>
        </Panel>
      )}
    </div>
  );
}
