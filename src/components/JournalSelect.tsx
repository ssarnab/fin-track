"use client";

import { Select } from "@/components/ui";
import type { ComponentNode } from "@/lib/useAccountTree";

/**
 * A <select> of journals, grouped by "Component › Ledger" via <optgroup>.
 * Only active journals are shown.
 */
export default function JournalSelect({
  tree,
  value,
  onChange,
  placeholder,
}: {
  tree: ComponentNode[];
  value: number | "";
  onChange: (id: number | "") => void;
  placeholder: string;
}) {
  return (
    <Select
      value={value}
      onChange={(e) => onChange(e.target.value ? Number(e.target.value) : "")}
    >
      <option value="">{placeholder}</option>
      {tree.map((c) =>
        c.ledgers.map((l) => {
          const journals = l.journals.filter((j) => j.is_active);
          if (journals.length === 0) return null;
          return (
            <optgroup key={l.id} label={`${c.name} › ${l.name}`}>
              {journals.map((j) => (
                <option key={j.id} value={j.id}>
                  {j.name}
                </option>
              ))}
            </optgroup>
          );
        }),
      )}
    </Select>
  );
}
