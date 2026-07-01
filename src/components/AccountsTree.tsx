"use client";

import { createContext, useContext, useState } from "react";
import { useAccountTree, type ComponentNode, type LedgerNode } from "@/lib/useAccountTree";
import {
  createComponent,
  createLedger,
  createJournal,
  renameComponent,
  renameLedger,
  renameJournal,
  deleteComponent,
  deleteLedger,
  deleteJournal,
} from "@/lib/accounts";
import { Button, Input, Select } from "@/components/ui";
import { COMPONENT_KINDS, type ComponentKind } from "@/lib/types";

// Reload the tree immediately after any mutation (realtime is best-effort).
const ReloadContext = createContext<() => void>(() => {});
const useReload = () => useContext(ReloadContext);

function Chevron({ open }: { open: boolean }) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`transition-transform ${open ? "rotate-90" : ""}`}
    >
      <path d="M9 18l6-6-6-6" />
    </svg>
  );
}

function InlineAdd({
  placeholder,
  onAdd,
}: {
  placeholder: string;
  onAdd: (name: string) => Promise<unknown>;
}) {
  const reload = useReload();
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit() {
    const v = name.trim();
    if (!v) return;
    setBusy(true);
    try {
      await onAdd(v);
      setName("");
      reload();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex gap-2">
      <Input
        value={name}
        placeholder={placeholder}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && submit()}
        className="py-1.5 text-sm"
      />
      <Button variant="surface" onClick={submit} disabled={busy} className="px-3 py-1.5 text-sm">
        Add
      </Button>
    </div>
  );
}

function RowActions({
  onRename,
  onDelete,
}: {
  onRename: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
      <button
        onClick={onRename}
        title="Rename"
        className="rounded p-1 text-muted hover:bg-surface-2 hover:text-fg"
      >
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 20h9M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4z" />
        </svg>
      </button>
      <button
        onClick={onDelete}
        title="Delete"
        className="rounded p-1 text-muted hover:bg-surface-2 hover:text-danger"
      >
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m2 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
        </svg>
      </button>
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

function LedgerBlock({ ledger }: { ledger: LedgerNode }) {
  const reload = useReload();
  const [open, setOpen] = useState(true);
  return (
    <div className="ml-4 border-l border-border pl-3">
      <div className="group flex items-center justify-between rounded-lg px-2 py-1.5 hover:bg-surface-2">
        <button
          onClick={() => setOpen((v) => !v)}
          className="flex items-center gap-2 text-left font-medium text-fg"
        >
          <Chevron open={open} />
          {ledger.name}
          <span className="text-xs text-muted">({ledger.journals.length})</span>
        </button>
        <RowActions
          onRename={() => {
            const n = window.prompt("Rename group:", ledger.name);
            if (n?.trim() && n.trim() !== ledger.name)
              run(() => renameLedger(ledger.id, n.trim()), reload);
          }}
          onDelete={() => {
            if (window.confirm(`Delete "${ledger.name}" and its accounts?`))
              run(() => deleteLedger(ledger.id), reload);
          }}
        />
      </div>

      {open && (
        <div className="ml-4 space-y-1 border-l border-border pl-3 py-1">
          {ledger.journals.map((j) => (
            <div
              key={j.id}
              className="group flex items-center justify-between rounded-lg px-2 py-1 hover:bg-surface-2"
            >
              <span className={`text-sm ${j.is_active ? "text-fg" : "text-muted line-through"}`}>
                {j.name}
              </span>
              <RowActions
                onRename={() => {
                  const n = window.prompt("Rename account:", j.name);
                  if (n?.trim() && n.trim() !== j.name)
                    run(() => renameJournal(j.id, n.trim()), reload);
                }}
                onDelete={() => {
                  if (window.confirm(`Delete "${j.name}"?`))
                    run(() => deleteJournal(j.id), reload);
                }}
              />
            </div>
          ))}
          <InlineAdd
            placeholder="New account…"
            onAdd={(name) => createJournal(ledger.id, name)}
          />
        </div>
      )}
    </div>
  );
}

const KIND_STYLES: Record<ComponentKind, string> = {
  asset: "bg-success/15 text-success",
  liability: "bg-danger/15 text-danger",
  equity: "bg-primary/15 text-primary",
  income: "bg-success/15 text-success",
  expense: "bg-warning/15 text-warning",
};

function ComponentBlock({ component }: { component: ComponentNode }) {
  const reload = useReload();
  const [open, setOpen] = useState(true);
  return (
    <div className="rounded-2xl border border-border bg-surface p-3 shadow-sm">
      <div className="group flex items-center justify-between rounded-lg px-2 py-1.5 hover:bg-surface-2">
        <button
          onClick={() => setOpen((v) => !v)}
          className="flex items-center gap-2 text-left text-lg font-semibold text-fg"
        >
          <Chevron open={open} />
          {component.name}
          <span className={`rounded-full px-2 py-0.5 text-xs font-medium capitalize ${KIND_STYLES[component.kind]}`}>
            {component.kind}
          </span>
        </button>
        <RowActions
          onRename={() => {
            const n = window.prompt("Rename category:", component.name);
            if (n?.trim() && n.trim() !== component.name)
              run(() => renameComponent(component.id, n.trim()), reload);
          }}
          onDelete={() => {
            if (window.confirm(`Delete "${component.name}" and everything under it?`))
              run(() => deleteComponent(component.id), reload);
          }}
        />
      </div>

      {open && (
        <div className="mt-1 space-y-1">
          {component.ledgers.map((l) => (
            <LedgerBlock key={l.id} ledger={l} />
          ))}
          <div className="ml-4 border-l border-border pl-3 py-1">
            <InlineAdd
              placeholder="New group…"
              onAdd={(name) => createLedger(component.id, name)}
            />
          </div>
        </div>
      )}
    </div>
  );
}

export default function AccountsTree() {
  const { tree, loading, error, reload } = useAccountTree(true);
  const [newKind, setNewKind] = useState<ComponentKind>("asset");

  if (loading) {
    return (
      <div className="space-y-4">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-20 animate-pulse rounded-2xl border border-border bg-surface" />
        ))}
      </div>
    );
  }
  if (error) {
    return (
      <div className="rounded-xl border border-danger/40 bg-danger/10 px-4 py-3 text-danger">
        {error}
      </div>
    );
  }

  return (
    <ReloadContext.Provider value={reload}>
      <div className="space-y-4">
        {tree.map((c) => (
          <ComponentBlock key={c.id} component={c} />
        ))}

        <div className="rounded-2xl border border-dashed border-border bg-surface/50 p-4">
          <p className="mb-2 text-sm font-medium text-muted">Add a new category</p>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Select
              value={newKind}
              onChange={(e) => setNewKind(e.target.value as ComponentKind)}
              className="sm:w-40"
            >
              {COMPONENT_KINDS.map((k) => (
                <option key={k.value} value={k.value}>
                  {k.label}
                </option>
              ))}
            </Select>
            <div className="flex-1">
              <InlineAdd
                placeholder="New category…"
                onAdd={(name) => createComponent(name, newKind)}
              />
            </div>
          </div>
        </div>
      </div>
    </ReloadContext.Provider>
  );
}
