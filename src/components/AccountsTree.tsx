"use client";

import { createContext, useContext, useMemo, useState } from "react";
import { useAccountTree, type ComponentNode, type LedgerNode } from "@/lib/useAccountTree";
import { useBalances } from "@/lib/useBalances";
import {
  createComponent,
  createLedger,
  createJournal,
  renameComponent,
  renameLedger,
  renameJournal,
  setJournalActive,
  deleteComponent,
  deleteLedger,
  deleteJournal,
} from "@/lib/accounts";
import { Button, Input, Select, Panel, Skeleton, ErrorNote, EmptyState, money } from "@/components/ui";
import { COMPONENT_KINDS, type ComponentKind } from "@/lib/types";

// Reload the tree immediately after any mutation (realtime is best-effort).
const ReloadContext = createContext<() => void>(() => {});
const useReload = () => useContext(ReloadContext);

/** Balance per journal id, so each account can show what is actually in it —
 * the tree used to be the one place you could not see that. */
const BalanceContext = createContext<Map<number, number>>(new Map());
const useBalanceOf = (id: number) => useContext(BalanceContext).get(id);

function Chevron({ open }: { open: boolean }) {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`shrink-0 text-muted transition-transform duration-150 ${open ? "rotate-90" : ""}`}
    >
      <path d="M9 18l6-6-6-6" />
    </svg>
  );
}

/** A quiet "+ add" line that only turns into a field once you click it, so a
 * long tree isn't padded out with an input box at every level. */
function InlineAdd({ label, onAdd }: { label: string; onAdd: (name: string) => Promise<unknown> }) {
  const reload = useReload();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit() {
    const v = name.trim();
    if (!v) return;
    setBusy(true);
    try {
      await onAdd(v);
      setName("");
      setOpen(false);
      reload();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Failed");
    } finally {
      setBusy(false);
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="rounded-md px-2 py-1 text-meta font-medium text-muted transition-colors hover:bg-surface-2 hover:text-primary"
      >
        + {label}
      </button>
    );
  }

  return (
    <div className="flex gap-1.5 py-0.5">
      <Input
        autoFocus
        value={name}
        placeholder={label}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") submit();
          if (e.key === "Escape") setOpen(false);
        }}
        pad="px-2 py-1"
        radius="rounded-md"
        ring="focus:ring-2 focus:ring-ring"
        width="min-w-40 flex-1"
      />
      <Button variant="surface" onClick={submit} disabled={busy} pad="px-2.5 py-1" text="text-meta">
        Add
      </Button>
      <Button variant="ghost" onClick={() => setOpen(false)} pad="px-2 py-1" text="text-meta">
        Cancel
      </Button>
    </div>
  );
}

function IconButton({
  title,
  onClick,
  danger,
  children,
}: {
  title: string;
  onClick: () => void;
  danger?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      aria-label={title}
      className={`grid h-6 w-6 place-items-center rounded-md text-muted transition-colors ${
        danger ? "hover:bg-danger/10 hover:text-danger" : "hover:bg-surface-2 hover:text-fg"
      }`}
    >
      {children}
    </button>
  );
}

const PencilPath = <path d="M12 20h9M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4z" />;
const TrashPath = (
  <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m2 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
);

function Icon({ children }: { children: React.ReactNode }) {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      {children}
    </svg>
  );
}

function RowActions({
  onRename,
  onDelete,
  extra,
}: {
  onRename: () => void;
  onDelete: () => void;
  extra?: React.ReactNode;
}) {
  return (
    <div className="flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
      {extra}
      <IconButton title="Rename" onClick={onRename}>
        <Icon>{PencilPath}</Icon>
      </IconButton>
      <IconButton title="Delete" onClick={onDelete} danger>
        <Icon>{TrashPath}</Icon>
      </IconButton>
    </div>
  );
}

async function run(fn: () => Promise<unknown>, reload: () => void) {
  try {
    await fn();
    reload();
  } catch (e) {
    alert(e instanceof Error ? e.message : "Failed");
  }
}

function JournalRow({ journal }: { journal: LedgerNode["journals"][number] }) {
  const reload = useReload();
  const balance = useBalanceOf(journal.id);
  const inactive = !journal.is_active;

  return (
    <li className="group flex items-center justify-between gap-2 rounded-md px-2 py-1.5 transition-colors hover:bg-surface-2/60">
      <span className={`min-w-0 flex-1 truncate text-body ${inactive ? "text-muted line-through" : "text-muted"}`}>
        {journal.name}
        {inactive && <span className="ml-1.5 text-micro text-muted">archived</span>}
      </span>
      {balance !== undefined && balance !== 0 && (
        <span className={`shrink-0 text-meta tabular-nums ${balance < 0 ? "text-danger" : "text-muted"}`}>
          {money(balance)}
        </span>
      )}
      <RowActions
        extra={
          // is_active has been in the schema (and struck through in this
          // list) all along with no way to actually set it.
          <IconButton
            title={inactive ? "Restore account" : "Archive account"}
            onClick={() => run(() => setJournalActive(journal.id, inactive), reload)}
          >
            <Icon>
              {inactive ? (
                <path d="M3 12a9 9 0 1 0 3-6.7L3 8m0-5v5h5" />
              ) : (
                <path d="M21 8v13H3V8M1 3h22v5H1zM10 12h4" />
              )}
            </Icon>
          </IconButton>
        }
        onRename={() => {
          const n = window.prompt("Rename account:", journal.name);
          if (n?.trim() && n.trim() !== journal.name) run(() => renameJournal(journal.id, n.trim()), reload);
        }}
        onDelete={() => {
          if (window.confirm(`Delete "${journal.name}"?`)) run(() => deleteJournal(journal.id), reload);
        }}
      />
    </li>
  );
}

function LedgerBlock({ ledger, forceOpen }: { ledger: LedgerNode; forceOpen: boolean }) {
  const reload = useReload();
  const [open, setOpen] = useState(true);
  const balances = useContext(BalanceContext);
  const shown = forceOpen || open;
  const total = ledger.journals.reduce((s, j) => s + (balances.get(j.id) ?? 0), 0);

  return (
    <li>
      <div className="group flex items-center justify-between gap-2 rounded-md px-2 py-1.5 transition-colors hover:bg-surface-2/60">
        <button onClick={() => setOpen((v) => !v)} className="flex min-w-0 items-center gap-1.5 text-left">
          <Chevron open={shown} />
          <span className="truncate text-body font-medium text-fg">{ledger.name}</span>
          <span className="shrink-0 text-meta tabular-nums text-muted">{ledger.journals.length}</span>
        </button>
        <div className="flex items-center gap-1.5">
          {total !== 0 && (
            <span className={`shrink-0 text-meta font-medium tabular-nums ${total < 0 ? "text-danger" : "text-muted"}`}>
              {money(total)}
            </span>
          )}
          <RowActions
            onRename={() => {
              const n = window.prompt("Rename group:", ledger.name);
              if (n?.trim() && n.trim() !== ledger.name) run(() => renameLedger(ledger.id, n.trim()), reload);
            }}
            onDelete={() => {
              if (window.confirm(`Delete "${ledger.name}" and its accounts?`))
                run(() => deleteLedger(ledger.id), reload);
            }}
          />
        </div>
      </div>

      {shown && (
        // A single hairline guide per level — cheaper to read than a box.
        <ul className="ml-3.25 border-l border-border pl-3">
          {ledger.journals.map((j) => (
            <JournalRow key={j.id} journal={j} />
          ))}
          <li className="py-0.5">
            <InlineAdd label="account" onAdd={(name) => createJournal(ledger.id, name)} />
          </li>
        </ul>
      )}
    </li>
  );
}

const KIND_STYLES: Record<ComponentKind, string> = {
  asset: "bg-success/12 text-success",
  liability: "bg-danger/12 text-danger",
  equity: "bg-primary/12 text-primary",
  income: "bg-chart-3/15 text-accent",
  expense: "bg-warning/12 text-warning",
};

function ComponentBlock({ component, forceOpen }: { component: ComponentNode; forceOpen: boolean }) {
  const reload = useReload();
  const balances = useContext(BalanceContext);
  const [open, setOpen] = useState(true);
  const shown = forceOpen || open;

  const accounts = component.ledgers.reduce((s, l) => s + l.journals.length, 0);
  const total = component.ledgers.reduce(
    (s, l) => s + l.journals.reduce((n, j) => n + (balances.get(j.id) ?? 0), 0),
    0,
  );

  return (
    <Panel
      title={
        <button onClick={() => setOpen((v) => !v)} className="flex min-w-0 items-center gap-2 text-left">
          <Chevron open={shown} />
          <span className="truncate">{component.name}</span>
          <span
            className={`shrink-0 rounded-full px-1.5 py-0.5 text-micro font-medium capitalize ${KIND_STYLES[component.kind]}`}
          >
            {component.kind}
          </span>
        </button>
      }
      subtitle={`${component.ledgers.length} groups · ${accounts} accounts`}
      actions={
        <>
          {total !== 0 && (
            <span className={`text-body font-semibold tabular-nums ${total < 0 ? "text-danger" : "text-fg"}`}>
              {money(total)}
            </span>
          )}
          <RowActions
            onRename={() => {
              const n = window.prompt("Rename category:", component.name);
              if (n?.trim() && n.trim() !== component.name) run(() => renameComponent(component.id, n.trim()), reload);
            }}
            onDelete={() => {
              if (window.confirm(`Delete "${component.name}" and everything under it?`))
                run(() => deleteComponent(component.id), reload);
            }}
          />
        </>
      }
      bodyPad={shown ? "p-1.5" : "p-0"}
    >
      {shown && (
        <ul>
          {component.ledgers.map((l) => (
            <LedgerBlock key={l.id} ledger={l} forceOpen={forceOpen} />
          ))}
          <li className="px-2 py-0.5">
            <InlineAdd label="group" onAdd={(name) => createLedger(component.id, name)} />
          </li>
        </ul>
      )}
    </Panel>
  );
}

export default function AccountsTree() {
  const { tree, loading, error, reload } = useAccountTree(true);
  const { balances } = useBalances();
  const [newKind, setNewKind] = useState<ComponentKind>("asset");
  const [query, setQuery] = useState("");

  const balanceById = useMemo(
    () => new Map(balances.map((b) => [b.journal_id, Number(b.balance)])),
    [balances],
  );

  // Searching prunes the tree to matching accounts (keeping their parents),
  // and forces everything open so the hits are actually visible.
  const q = query.trim().toLowerCase();
  const shownTree = useMemo(() => {
    if (!q) return tree;
    return tree
      .map((c) => ({
        ...c,
        ledgers: c.ledgers
          .map((l) => ({
            ...l,
            journals: l.journals.filter(
              (j) =>
                j.name.toLowerCase().includes(q) ||
                l.name.toLowerCase().includes(q) ||
                c.name.toLowerCase().includes(q),
            ),
          }))
          .filter((l) => l.journals.length > 0 || l.name.toLowerCase().includes(q)),
      }))
      .filter((c) => c.ledgers.length > 0 || c.name.toLowerCase().includes(q));
  }, [tree, q]);

  if (loading) {
    return (
      <div className="space-y-2">
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-28" />
        ))}
      </div>
    );
  }
  if (error) return <ErrorNote>{error}</ErrorNote>;

  return (
    <ReloadContext.Provider value={reload}>
      <BalanceContext.Provider value={balanceById}>
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2 rounded-xl border border-border bg-surface p-1.5 shadow-(--shadow)">
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search accounts, groups, categories…"
              pad="px-2.5 py-1.5"
              radius="rounded-lg"
              ring="focus:ring-2 focus:ring-ring"
              width="min-w-52 flex-1"
            />
            {q && (
              <button
                onClick={() => setQuery("")}
                className="rounded-lg bg-surface-2 px-2.5 py-1 text-meta font-medium text-muted transition-colors hover:text-fg"
              >
                Clear
              </button>
            )}
          </div>

          {shownTree.length === 0 ? (
            <EmptyState title="Nothing matches that search." hint="Try a shorter term, or clear the filter." />
          ) : (
            shownTree.map((c) => <ComponentBlock key={c.id} component={c} forceOpen={!!q} />)
          )}

          <div className="rounded-xl border border-dashed border-border bg-surface/40 p-3">
            <p className="mb-2 text-micro font-semibold text-muted uppercase">New category</p>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start">
              <Select
                value={newKind}
                onChange={(e) => setNewKind(e.target.value as ComponentKind)}
                pad="px-2.5 py-1.5"
                radius="rounded-lg"
                width="sm:w-40 w-full"
              >
                {COMPONENT_KINDS.map((k) => (
                  <option key={k.value} value={k.value}>
                    {k.label}
                  </option>
                ))}
              </Select>
              <InlineAdd label="category" onAdd={(name) => createComponent(name, newKind)} />
            </div>
          </div>
        </div>
      </BalanceContext.Provider>
    </ReloadContext.Provider>
  );
}
