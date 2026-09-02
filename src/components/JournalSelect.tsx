"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { money } from "@/components/ui";
import { isWalletKind, type ComponentKind } from "@/lib/types";
import type { ComponentNode } from "@/lib/useAccountTree";

type Option = { id: number; name: string; groupLabel: string; kind: ComponentKind };

function buildOptions(tree: ComponentNode[]): Option[] {
  const opts: Option[] = [];
  for (const c of tree) {
    for (const l of c.ledgers) {
      for (const j of l.journals.filter((j) => j.is_active)) {
        opts.push({ id: j.id, name: j.name, groupLabel: `${c.name} › ${l.name}`, kind: c.kind });
      }
    }
  }
  return opts;
}

function balanceTint(n: number): string {
  if (n > 0) return "text-success";
  if (n < 0) return "text-danger";
  return "text-muted";
}

/**
 * A searchable account picker, grouped by "Component › Ledger". Asset/
 * liability accounts ("wallets") show their live balance both on the closed
 * control and next to each option — income/expense/equity don't, since a
 * running balance isn't a meaningful number for those.
 */
export default function JournalSelect({
  tree,
  value,
  onChange,
  placeholder,
  balanceByJournal,
}: {
  tree: ComponentNode[];
  value: number | "";
  onChange: (id: number | "") => void;
  placeholder: string;
  balanceByJournal?: Map<number, number>;
}) {
  const options = useMemo(() => buildOptions(tree), [tree]);
  const selected = options.find((o) => o.id === value);

  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [highlight, setHighlight] = useState<number | null>(null);

  const rootRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter(
      (o) => o.name.toLowerCase().includes(q) || o.groupLabel.toLowerCase().includes(q),
    );
  }, [options, query]);

  const groups = useMemo(() => {
    const out: { label: string; items: Option[] }[] = [];
    for (const o of filtered) {
      const g = out.at(-1)?.label === o.groupLabel ? out.at(-1) : undefined;
      if (g) g.items.push(o);
      else out.push({ label: o.groupLabel, items: [o] });
    }
    return out;
  }, [filtered]);

  useEffect(() => {
    if (!open) return;
    setQuery("");
    setHighlight(value !== "" ? value : (filtered[0]?.id ?? null));
    requestAnimationFrame(() => searchRef.current?.focus());
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!open) return;
    function onDocClick(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [open]);

  function select(id: number) {
    onChange(id);
    setOpen(false);
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Escape") {
      e.preventDefault();
      setOpen(false);
      return;
    }
    if (e.key === "Enter") {
      e.preventDefault();
      if (highlight !== null) select(highlight);
      return;
    }
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      const idx = filtered.findIndex((o) => o.id === highlight);
      const next =
        e.key === "ArrowDown"
          ? filtered[Math.min(filtered.length - 1, idx + 1)]
          : filtered[Math.max(0, idx - 1)];
      if (next) setHighlight(next.id);
    }
  }

  const selectedBal = selected && isWalletKind(selected.kind) ? balanceByJournal?.get(selected.id) : undefined;

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-3 rounded-xl border border-border bg-surface-2 px-3 py-2.5 text-left outline-none transition hover:border-border-strong focus:border-primary focus:ring-2 focus:ring-ring"
      >
        {selected ? (
          <span className="min-w-0">
            <span className="block truncate font-medium text-fg">{selected.name}</span>
            <span className="block truncate text-xs text-muted">{selected.groupLabel}</span>
          </span>
        ) : (
          <span className="truncate text-muted">{placeholder}</span>
        )}
        <span className="flex shrink-0 items-center gap-2">
          {selectedBal !== undefined && (
            <span className={`text-sm font-semibold tabular-nums ${balanceTint(selectedBal)}`}>
              {money(selectedBal)}
            </span>
          )}
          <ChevronIcon className={`text-muted transition-transform ${open ? "rotate-180" : ""}`} />
        </span>
      </button>

      {open && (
        <div className="absolute z-20 mt-2 w-full overflow-hidden rounded-xl border border-border bg-surface shadow-xl">
          <div className="border-b border-border p-2">
            <input
              ref={searchRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={onKeyDown}
              placeholder="Search accounts…"
              className="w-full rounded-lg bg-surface-2 px-3 py-2 text-sm text-fg outline-none placeholder:text-muted"
            />
          </div>
          <div className="max-h-72 overflow-y-auto p-1.5">
            {groups.length === 0 && (
              <p className="px-3 py-6 text-center text-sm text-muted">No matching accounts</p>
            )}
            {groups.map((g) => (
              <div key={g.label} className="mb-1 last:mb-0">
                <p className="px-2 pb-1 pt-2 text-[11px] font-medium uppercase tracking-wide text-muted">
                  {g.label}
                </p>
                {g.items.map((o) => {
                  const bal = isWalletKind(o.kind) ? balanceByJournal?.get(o.id) : undefined;
                  return (
                    <button
                      key={o.id}
                      type="button"
                      onMouseEnter={() => setHighlight(o.id)}
                      onClick={() => select(o.id)}
                      className={`flex w-full items-center justify-between gap-3 rounded-lg px-2.5 py-2 text-left text-sm transition-colors ${
                        highlight === o.id ? "bg-surface-2" : ""
                      } ${o.id === value ? "text-primary" : "text-fg"}`}
                    >
                      <span className="truncate">{o.name}</span>
                      {bal !== undefined && (
                        <span className={`shrink-0 tabular-nums font-medium ${balanceTint(bal)}`}>
                          {money(bal)}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function ChevronIcon({ className = "" }: { className?: string }) {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className={className}>
      <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
