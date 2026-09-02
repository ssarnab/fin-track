"use client";

import { useEffect, useRef, useState } from "react";
import { CATEGORY_PRESETS, categoryColor } from "@/lib/routineCategory";

export default function CategoryPicker({
  value,
  onChange,
}: {
  value: string | null;
  onChange: (v: string | null) => void;
}) {
  const [open, setOpen] = useState(false);
  const [custom, setCustom] = useState("");
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    setCustom("");
    function onDocClick(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [open]);

  function select(v: string | null) {
    onChange(v);
    setOpen(false);
  }

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-2 rounded-xl border border-border bg-surface-2 px-3 py-2.5 text-left text-sm outline-none transition-all duration-150 hover:border-border-strong focus:border-primary focus:ring-4 focus:ring-ring"
      >
        {value ? (
          <>
            <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: categoryColor(value) }} />
            <span className="truncate text-fg">{value}</span>
          </>
        ) : (
          <span className="text-muted">No category</span>
        )}
        <ChevronIcon className={`ml-auto shrink-0 text-muted transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="absolute z-20 mt-2 w-48 overflow-hidden rounded-xl border border-border bg-surface p-1.5 shadow-xl">
          {CATEGORY_PRESETS.map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => select(p)}
              className={`flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-sm transition-colors hover:bg-surface-2 ${
                value === p ? "text-primary" : "text-fg"
              }`}
            >
              <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: categoryColor(p) }} />
              {p}
            </button>
          ))}

          <div className="mt-1 border-t border-border pt-1.5">
            <input
              value={custom}
              onChange={(e) => setCustom(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && custom.trim()) select(custom.trim());
              }}
              placeholder="Custom…"
              className="w-full rounded-lg bg-surface-2 px-2.5 py-1.5 text-sm text-fg outline-none placeholder:text-muted"
            />
          </div>

          {value && (
            <button
              type="button"
              onClick={() => select(null)}
              className="mt-1 w-full rounded-lg px-2.5 py-1.5 text-left text-xs text-muted transition-colors hover:text-danger"
            >
              Clear
            </button>
          )}
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
