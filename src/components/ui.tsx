"use client";

import { useEffect } from "react";
import type {
  ButtonHTMLAttributes,
  InputHTMLAttributes,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
  ReactNode,
} from "react";

export function Card({
  children,
  className = "",
  hoverable = false,
  pad = "p-5",
}: {
  children: ReactNode;
  className?: string;
  /** Lifts + brightens the border on hover — for cards that act like a link/button. */
  hoverable?: boolean;
  /** Padding utilities, as a *replacement* for the default — a `p-*` passed
   * through `className` loses to this one whenever Tailwind happens to emit
   * it earlier in the sheet, which is silent and maddening to debug. */
  pad?: string;
}) {
  return (
    <div
      className={`rounded-2xl border border-border bg-surface shadow-(--shadow) transition-all duration-200 ${pad} ${
        hoverable ? "hover:-translate-y-0.5 hover:border-border-strong hover:shadow-(--shadow-lg)" : ""
      } ${className}`}
    >
      {children}
    </div>
  );
}

export function PageTitle({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle?: string;
  /** Right-aligned controls that belong to the page as a whole. */
  actions?: ReactNode;
}) {
  return (
    <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
      <div className="min-w-0">
        <h1 className="text-page font-semibold tracking-tight text-fg">{title}</h1>
        {subtitle && <p className="mt-0.5 text-meta text-muted">{subtitle}</p>}
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </div>
  );
}

// Same trap as Card.pad: a padding or radius utility passed through
// className competes with the one baked in here and can lose on stylesheet
// order, so both are props that replace the default outright.
const baseControl =
  "border border-border bg-surface-2 text-fg placeholder:text-muted outline-none transition-all duration-150 focus:border-primary";

// text: form controls had no font size at all, so they rendered at the
// browser default 16px inside a 14px UI, under a 13px label.
type ControlProps = { pad?: string; radius?: string; ring?: string; width?: string; text?: string };

export function Input({
  className = "",
  pad = "px-2.5 py-1.5",
  radius = "rounded-lg",
  ring = "focus:ring-2 focus:ring-ring",
  width = "w-full",
  text = "text-body",
  ...rest
}: InputHTMLAttributes<HTMLInputElement> & ControlProps) {
  return <input {...rest} className={`${baseControl} ${width} ${radius} ${pad} ${ring} ${text} ${className}`} />;
}

export function Select({
  className = "",
  pad = "px-2.5 py-1.5",
  radius = "rounded-lg",
  ring = "focus:ring-2 focus:ring-ring",
  width = "w-full",
  text = "text-body",
  children,
  ...rest
}: SelectHTMLAttributes<HTMLSelectElement> & ControlProps) {
  return (
    <select {...rest} className={`${baseControl} ${width} ${radius} ${pad} ${ring} ${text} ${className}`}>
      {children}
    </select>
  );
}

export function Textarea({
  className = "",
  pad = "px-2.5 py-1.5",
  radius = "rounded-lg",
  ring = "focus:ring-2 focus:ring-ring",
  width = "w-full",
  text = "text-body",
  ...rest
}: TextareaHTMLAttributes<HTMLTextAreaElement> & ControlProps) {
  return <textarea {...rest} className={`${baseControl} ${width} ${radius} ${pad} ${ring} ${text} resize-none ${className}`} />;
}

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-meta font-medium text-muted">{label}</span>
      {children}
    </label>
  );
}

type BtnProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "surface" | "danger" | "ghost";
  /** Replaces the default padding — see the note on Card.pad. */
  pad?: string;
  /** Replaces the default text size, for the same reason. */
  text?: string;
};

export function Button({
  variant = "primary",
  className = "",
  pad = "px-3.5 py-2",
  text = "text-body",
  ...rest
}: BtnProps) {
  const variants = {
    primary:
      "bg-primary text-primary-fg shadow-(--shadow) hover:bg-primary-hover hover:shadow-(--shadow-lg) active:scale-[0.98]",
    surface: "border border-border bg-surface-2 text-fg hover:border-border-strong hover:bg-border active:scale-[0.98]",
    danger: "bg-danger text-primary-fg hover:opacity-90 active:scale-[0.98]",
    ghost: "text-muted hover:bg-surface-2 hover:text-fg active:scale-[0.98]",
  };
  return (
    <button
      {...rest}
      className={`rounded-lg font-medium transition-all duration-150 disabled:opacity-60 disabled:active:scale-100 ${text} ${pad} ${variants[variant]} ${className}`}
    />
  );
}

/** Small pill for status/trend/count labels — e.g. "+3.2%", "Active", "3 overdue". */
export function Badge({
  children,
  tone = "neutral",
  className = "",
}: {
  children: ReactNode;
  tone?: "neutral" | "primary" | "success" | "danger" | "warning";
  className?: string;
}) {
  const tones = {
    neutral: "bg-surface-2 text-muted",
    primary: "bg-primary/15 text-primary",
    success: "bg-success/15 text-success",
    danger: "bg-danger/15 text-danger",
    warning: "bg-warning/15 text-warning",
  };
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-meta font-medium tabular-nums ${tones[tone]} ${className}`}
    >
      {children}
    </span>
  );
}

/** Shimmering placeholder block for loading states — sized via className. */
export function Skeleton({ className = "" }: { className?: string }) {
  return (
    <div
      className={`animate-shimmer rounded-xl bg-linear-to-r from-surface-2 via-border to-surface-2 bg-size-[200%_100%] ${className}`}
    />
  );
}

export function money(n: number): string {
  const s = new Intl.NumberFormat(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Math.abs(n));
  return `${n < 0 ? "-" : ""}৳${s}`;
}

/** Centred dialog on desktop, bottom sheet on phones. Closes on backdrop
 * click or Escape, and locks the page behind it so the sheet is the only
 * thing that scrolls. */
export function Modal({
  open,
  onClose,
  title,
  subtitle,
  children,
  footer,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      onClick={onClose}
      className="animate-fade-in fixed inset-0 z-50 flex items-end justify-center bg-black/55 backdrop-blur-[2px] sm:items-center sm:p-4"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="animate-sheet max-h-[88vh] w-full overflow-y-auto rounded-t-2xl border border-border bg-surface shadow-(--shadow-lg) sm:max-w-md sm:rounded-2xl"
      >
        <div className="sticky top-0 flex items-start justify-between gap-3 border-b border-border bg-surface px-5 py-3.5">
          <div className="min-w-0">
            <h3 className="truncate text-title font-semibold text-fg">{title}</h3>
            {subtitle && <div className="mt-0.5 truncate text-meta text-muted">{subtitle}</div>}
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="-mr-1.5 grid h-7 w-7 shrink-0 place-items-center rounded-lg text-muted transition-colors hover:bg-surface-2 hover:text-fg"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="px-5 py-4">{children}</div>
        {footer && (
          <div className="flex items-center justify-end gap-2 border-t border-border bg-surface-2/40 px-5 py-3">{footer}</div>
        )}
      </div>
    </div>
  );
}

/** Six-dot drag affordance — shared by the routine lists so the grip looks
 * and sits the same on the timeline and in the template editor. */
export function Grip() {
  return (
    <svg width="10" height="14" viewBox="0 0 10 14" fill="currentColor" aria-hidden>
      <circle cx="3" cy="3" r="1.1" />
      <circle cx="7" cy="3" r="1.1" />
      <circle cx="3" cy="7" r="1.1" />
      <circle cx="7" cy="7" r="1.1" />
      <circle cx="3" cy="11" r="1.1" />
      <circle cx="7" cy="11" r="1.1" />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Shared page furniture. Every screen was growing its own stat tile, section
// header, meter bar and empty state — near-identical but never quite the
// same, which is exactly what makes an app look homemade. These are the one
// version of each.
// ---------------------------------------------------------------------------

/** Card with a hairline header — the standard container for a titled section. */
export function Panel({
  title,
  subtitle,
  actions,
  children,
  bodyPad = "p-3",
  className = "",
}: {
  title?: ReactNode;
  subtitle?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  /** Padding for the body only; the header keeps its own. */
  bodyPad?: string;
  className?: string;
}) {
  return (
    <section
      className={`overflow-hidden rounded-xl border border-border bg-surface shadow-(--shadow) ${className}`}
    >
      {(title || actions) && (
        /* group: so header actions that only appear on hover (rename,
           delete) have something to hook onto. */
        <header className="group flex items-center justify-between gap-2 border-b border-border px-3 py-1.5">
          <div className="min-w-0">
            {title && <h2 className="truncate text-title font-semibold tracking-tight text-fg">{title}</h2>}
            {subtitle && <p className="mt-0.5 truncate text-meta text-muted">{subtitle}</p>}
          </div>
          {actions && <div className="flex shrink-0 items-center gap-1.5">{actions}</div>}
        </header>
      )}
      <div className={bodyPad}>{children}</div>
    </section>
  );
}

export type Tone = "fg" | "muted" | "primary" | "success" | "danger" | "warning" | "accent";

const TONE_TEXT: Record<Tone, string> = {
  fg: "text-fg",
  muted: "text-muted",
  primary: "text-primary",
  success: "text-success",
  danger: "text-danger",
  warning: "text-warning",
  accent: "text-accent",
};

/** One number and what it means. The label is small caps, the value is
 * tabular so a row of these lines up digit for digit. */
export function Stat({
  label,
  value,
  hint,
  tone = "fg",
}: {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  tone?: Tone;
}) {
  return (
    <div className="rounded-lg border border-border bg-surface px-3 py-2">
      <p className="text-micro font-semibold text-muted uppercase">{label}</p>
      <p className={`mt-1 truncate text-metric font-semibold tracking-tight tabular-nums ${TONE_TEXT[tone]}`}>{value}</p>
      {hint && <p className="mt-0.5 truncate text-meta text-muted">{hint}</p>}
    </div>
  );
}

/** A labelled proportion bar — "Groceries · Food … ৳1,240 (32%)" over a
 * track. The breakdown lists on Report, Balances and Routine are all this. */
export function MeterRow({
  label,
  sub,
  value,
  pct,
  color = "var(--primary)",
  note,
}: {
  label: ReactNode;
  sub?: ReactNode;
  value: ReactNode;
  /** 0-100. */
  pct: number;
  /** Any CSS color — category colors come from routineCategory/chart tokens. */
  color?: string;
  note?: ReactNode;
}) {
  return (
    <div>
      <div className="flex items-baseline justify-between gap-3">
        <span className="flex min-w-0 items-baseline gap-1.5">
          <span className="truncate text-body text-fg">{label}</span>
          {sub && <span className="shrink-0 truncate text-meta text-muted">{sub}</span>}
        </span>
        <span className="shrink-0 text-body font-medium tabular-nums text-fg">{value}</span>
      </div>
      <div className="mt-1 h-0.75 overflow-hidden rounded-full bg-surface-2">
        <div
          className="h-full rounded-full transition-[width] duration-500"
          style={{ width: `${Math.max(0, Math.min(100, pct))}%`, background: color }}
        />
      </div>
      {note && <p className="mt-1 text-meta tabular-nums text-muted">{note}</p>}
    </div>
  );
}

export function EmptyState({ title, hint }: { title: ReactNode; hint?: ReactNode }) {
  return (
    <div className="rounded-xl border border-dashed border-border bg-surface/40 px-6 py-8 text-center">
      <p className="text-body text-fg">{title}</p>
      {hint && <p className="mx-auto mt-1 max-w-sm text-meta text-muted">{hint}</p>}
    </div>
  );
}

export function ErrorNote({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-lg border border-danger/40 bg-danger/10 px-3 py-2 text-body text-danger">
      {children}
    </div>
  );
}

/** Period-over-period change. `null` renders a dash — there is no honest
 * percentage against a zero baseline. `invert` flips the colour for metrics
 * where up is bad (spending), without flipping the arrow. */
export function Delta({
  value,
  invert = false,
  suffix = "%",
}: {
  value: number | null;
  invert?: boolean;
  suffix?: string;
}) {
  if (value === null || !isFinite(value)) return <span className="text-meta text-muted">—</span>;
  const up = value >= 0;
  const good = invert ? !up : up;
  return (
    <span
      className={`inline-flex items-center gap-0.5 text-meta font-semibold tabular-nums ${
        Math.abs(value) < 0.5 ? "text-muted" : good ? "text-success" : "text-danger"
      }`}
    >
      <span aria-hidden>{up ? "▲" : "▼"}</span>
      {Math.abs(value).toFixed(Math.abs(value) < 10 ? 1 : 0)}
      {suffix}
    </span>
  );
}

/** Segmented control — a small set of mutually exclusive options. */
export function Segmented<T extends string>({
  value,
  onChange,
  options,
  size = "sm",
}: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string }[];
  size?: "sm" | "xs";
}) {
  const pad = size === "xs" ? "px-2 py-1 text-meta" : "px-2.5 py-1.5 text-meta";
  return (
    <div className="flex gap-0.5 rounded-lg bg-surface-2 p-0.5">
      {options.map((o) => (
        <button
          key={o.value}
          onClick={() => onChange(o.value)}
          className={`rounded-md font-medium transition-colors ${pad} ${
            value === o.value ? "bg-primary text-primary-fg" : "text-muted hover:text-fg"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

/** Toolbar checkbox. The native input stays in the DOM (keyboard, screen
 * readers, form semantics) and drives the drawn box via `peer-checked`; the
 * tick is always rendered and inherits its colour, because `peer-checked`
 * reaches siblings of the input, not descendants of one. */
export function Checkbox({
  checked,
  onChange,
  label,
  title,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: ReactNode;
  title?: string;
}) {
  return (
    <label
      title={title}
      className="flex shrink-0 cursor-pointer items-center gap-1.5 rounded-lg bg-surface-2 py-1 pr-2.5 pl-2 text-meta text-muted transition-colors select-none hover:text-fg has-checked:text-fg"
    >
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="peer sr-only" />
      <span className="grid h-3.5 w-3.5 place-items-center rounded-sm border border-border-strong bg-surface text-transparent transition-colors peer-checked:border-primary peer-checked:bg-primary peer-checked:text-primary-fg peer-focus-visible:ring-2 peer-focus-visible:ring-ring">
        <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
          <path d="M20 6L9 17l-5-5" />
        </svg>
      </span>
      {label}
    </label>
  );
}
