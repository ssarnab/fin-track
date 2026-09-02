"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useAccountTree } from "@/lib/useAccountTree";
import { useBalances } from "@/lib/useBalances";
import { createTransaction } from "@/lib/transactions";
import { Button, Card, Field, Input, PageTitle } from "@/components/ui";
import JournalSelect from "@/components/JournalSelect";
import { todayISO } from "@/lib/date";

export default function EntryForm() {
  const { tree, journals, loading } = useAccountTree(true);
  const { balances } = useBalances();

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

  const canSave = useMemo(() => {
    const amt = Number(amount);
    return (
      inJournal !== "" &&
      outJournal !== "" &&
      inJournal !== outJournal &&
      amt > 0 &&
      !!date
    );
  }, [inJournal, outJournal, amount, date]);

  async function save() {
    if (!canSave) return;
    setBusy(true);
    setMsg(null);
    try {
      await createTransaction({
        txn_date: date,
        debit_journal_id: Number(inJournal),
        credit_journal_id: Number(outJournal),
        amount: Number(amount),
        remarks: note,
      });
      setMsg({ type: "ok", text: "Saved ✓" });
      setAmount("");
      setNote("");
    } catch (e) {
      setMsg({ type: "err", text: e instanceof Error ? e.message : "Save failed" });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl">
      <PageTitle title="New entry" subtitle="Money moves OUT of one account and IN to another." />

      {!loading && !hasJournals && (
        <Card className="mb-4 border-warning/40 bg-warning/10">
          <p className="text-sm text-fg">
            You have no accounts yet. Add some in{" "}
            <Link href="/accounts" className="font-medium text-primary underline">
              Accounts
            </Link>{" "}
            first.
          </p>
        </Card>
      )}

      <Card>
        <div className="grid gap-4">
          <Field label="In  ·  money comes into (debit)">
            <JournalSelect
              tree={tree}
              value={inJournal}
              onChange={setInJournal}
              placeholder="Choose In account"
              balanceByJournal={balanceByJournal}
            />
          </Field>

          <Field label="Out  ·  money goes out of (credit)">
            <JournalSelect
              tree={tree}
              value={outJournal}
              onChange={setOutJournal}
              placeholder="Choose Out account"
              balanceByJournal={balanceByJournal}
            />
          </Field>

          {inJournal !== "" && inJournal === outJournal && (
            <p className="-mt-2 text-sm text-danger">In and Out must be different accounts.</p>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Amount">
              <Input
                type="number"
                inputMode="decimal"
                min="0"
                step="0.01"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </Field>
            <Field label="Date">
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </Field>
          </div>

          <Field label="Note">
            <Input
              placeholder="Optional note"
              value={note}
              maxLength={100}
              onChange={(e) => setNote(e.target.value)}
            />
          </Field>

          {msg && (
            <p
              className={`rounded-lg px-3 py-2 text-sm ${
                msg.type === "ok"
                  ? "bg-success/10 text-success"
                  : "bg-danger/10 text-danger"
              }`}
            >
              {msg.text}
            </p>
          )}

          <div className="flex justify-end">
            <Button onClick={save} disabled={!canSave || busy} className="px-8">
              {busy ? "Saving…" : "Save"}
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
