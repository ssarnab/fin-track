"use client";

import { formatDuration } from "@/lib/time";

export const SHIFT_STEP = 15; // minutes per notch
// ±12h is the whole range there is: the plan lives on a circular 24-hour
// clock, so shifting +13h lands in exactly the same place as −11h. Anything
// past half a day would just be the opposite shift wearing a bigger number.
export const SHIFT_RANGE = 720;

/** Narrow enough to sit inside a toolbar next to the other controls, so the
 * long-form "On schedule" never fits — a signed duration does. */
function compactShift(minutes: number): string {
  if (minutes === 0) return "±0m";
  return `${minutes > 0 ? "+" : "−"}${formatDuration(Math.abs(minutes))}`;
}

/** Compact signed slider for moving a whole schedule earlier or later.
 * Used both for a single day (Today) and for the template itself.
 *
 * The full range is 96 notches, which is more than a short track can resolve
 * by dragging alone — so the hour marks are drawn on the track, and the
 * arrow keys (native to a range input) step exactly 15 minutes for the times
 * a drag lands one notch off. */
export default function ShiftSlider({
  label,
  value,
  onChange,
  title,
  range = SHIFT_RANGE,
  step = SHIFT_STEP,
  fullWidth = false,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  title?: string;
  /** Travel each way, in minutes. A whole day shifts by up to ±12h; a single
   * block is being nudged, so it wants a tighter range and finer steps. */
  range?: number;
  step?: number;
  /** Fill the row instead of sitting inline in a toolbar. */
  fullWidth?: boolean;
}) {
  const clamped = Math.max(-range, Math.min(range, value));
  // The value is signed, so the fill grows out from the centre rather than
  // from the left end the way a plain range track would paint it.
  const pos = ((clamped + range) / (2 * range)) * 100;
  const [from, to] = pos >= 50 ? [50, pos] : [pos, 50];
  const fill = `linear-gradient(to right, transparent 0 ${from}%, var(--primary) ${from}% ${to}%, transparent ${to}% 100%)`;
  // Eight even divisions of whatever the range is (3h apart on the day
  // slider, 45m on the block one), plus a mark at zero so "back on plan" is
  // findable by eye rather than by reading the number.
  const ticks =
    "repeating-linear-gradient(to right, var(--border-strong) 0 1px, transparent 1px 12.5%)";
  const centre =
    "linear-gradient(to right, transparent calc(50% - 1px), var(--border-strong) calc(50% - 1px) calc(50% + 1px), transparent calc(50% + 1px))";

  return (
    <div
      className={`flex items-center gap-2 rounded-lg bg-surface-2 py-1 pr-1 pl-2.5 ${
        fullWidth ? "w-full" : "shrink-0"
      }`}
    >
      <span className="text-meta whitespace-nowrap text-muted">{label}</span>
      <input
        type="range"
        min={-range}
        max={range}
        step={step}
        value={clamped}
        onChange={(e) => onChange(Number(e.target.value))}
        onDoubleClick={() => onChange(0)}
        title={title ?? `Slide to move the whole schedule — arrow keys nudge ${step}m, double-click resets`}
        aria-label={label}
        aria-valuetext={compactShift(clamped)}
        className={fullWidth ? "slider min-w-24 flex-1" : "slider w-32"}
        style={{ background: `${fill}, ${centre}, ${ticks}, var(--surface)` }}
      />
      <span
        className={`w-18 text-right text-meta font-semibold whitespace-nowrap tabular-nums ${
          clamped === 0 ? "text-muted" : "text-primary"
        }`}
      >
        {compactShift(clamped)}
      </span>
      <button
        onClick={() => onChange(0)}
        disabled={clamped === 0}
        aria-label="Reset shift"
        title="Reset"
        className="grid h-5 w-5 place-items-center rounded text-muted transition-colors hover:bg-surface hover:text-fg disabled:opacity-0"
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 12a9 9 0 1 0 3-6.7L3 8" />
          <path d="M3 3v5h5" />
        </svg>
      </button>
    </div>
  );
}
