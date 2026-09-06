"use client";

import { useEffect, useState } from "react";

/** A boolean that remembers itself across reloads. Reading localStorage
 * during render would desync the server-rendered HTML, so the stored value
 * is picked up after mount instead. */
export function useLocalToggle(key: string, initial = false): [boolean, (v: boolean) => void] {
  const [value, setValue] = useState(initial);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(key);
      if (saved !== null) setValue(saved === "1");
    } catch {
      // ignore — falls back to the initial value
    }
  }, [key]);

  function update(v: boolean) {
    setValue(v);
    try {
      localStorage.setItem(key, v ? "1" : "0");
    } catch {
      // best-effort only
    }
  }

  return [value, update];
}
