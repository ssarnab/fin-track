"use client";

import { useEffect, useState } from "react";
import { ensureDefaultRoutineItems } from "@/lib/routine";
import RoutineChecklist from "@/components/RoutineChecklist";
import RoutineProgress from "@/components/RoutineProgress";
import RoutineTemplates from "@/components/RoutineTemplates";

type Tab = "today" | "progress" | "templates";

export default function Routine() {
  const [tab, setTab] = useState<Tab>("today");

  useEffect(() => {
    ensureDefaultRoutineItems().catch(() => {
      // First-run seeding is best-effort — an empty Templates tab still
      // lets the user add items by hand if this silently fails.
    });
  }, []);

  return (
    <div className="space-y-3">
      <div className="flex gap-0.5 rounded-xl bg-surface-2 p-0.5 text-body">
        {([
          ["today", "Today"],
          ["progress", "Progress"],
          ["templates", "Templates"],
        ] as [Tab, string][]).map(([value, label]) => (
          <button
            key={value}
            onClick={() => setTab(value)}
            className={`flex-1 rounded-[10px] py-1.5 font-medium transition-all duration-150 ${
              tab === value ? "bg-primary text-primary-fg shadow-(--shadow)" : "text-muted hover:text-fg"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "today" && <RoutineChecklist />}
      {tab === "progress" && <RoutineProgress />}
      {tab === "templates" && <RoutineTemplates />}
    </div>
  );
}
