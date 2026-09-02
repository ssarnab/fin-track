"use client";

import type {
  ButtonHTMLAttributes,
  InputHTMLAttributes,
  SelectHTMLAttributes,
  ReactNode,
} from "react";

export function Card({
  children,
  className = "",
  hoverable = false,
}: {
  children: ReactNode;
  className?: string;
  /** Lifts + brightens the border on hover — for cards that act like a link/button. */
  hoverable?: boolean;
}) {
  return (
    <div
      className={`rounded-2xl border border-border bg-surface p-5 shadow-(--shadow) transition-all duration-200 ${
        hoverable ? "hover:-translate-y-0.5 hover:border-border-strong hover:shadow-(--shadow-lg)" : ""
      } ${className}`}
    >
      {children}
    </div>
  );
}

export function PageTitle({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="mb-6">
      <h1 className="text-2xl font-semibold tracking-tight text-fg">{title}</h1>
      {subtitle && <p className="mt-1.5 text-sm text-muted">{subtitle}</p>}
    </div>
  );
}

const baseControl =
  "w-full rounded-xl border border-border bg-surface-2 px-3 py-2.5 text-fg placeholder:text-muted outline-none transition-all duration-150 focus:border-primary focus:ring-4 focus:ring-ring";

export function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  const { className = "", ...rest } = props;
  return <input {...rest} className={`${baseControl} ${className}`} />;
}

export function Select(props: SelectHTMLAttributes<HTMLSelectElement>) {
  const { className = "", children, ...rest } = props;
  return (
    <select {...rest} className={`${baseControl} ${className}`}>
      {children}
    </select>
  );
}

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-muted">{label}</span>
      {children}
    </label>
  );
}

type BtnProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "surface" | "danger" | "ghost";
};

export function Button({ variant = "primary", className = "", ...rest }: BtnProps) {
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
      className={`rounded-xl px-4 py-2.5 font-medium transition-all duration-150 disabled:opacity-60 disabled:active:scale-100 ${variants[variant]} ${className}`}
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
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium tabular-nums ${tones[tone]} ${className}`}
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
