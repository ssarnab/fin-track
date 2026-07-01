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
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`rounded-2xl border border-border bg-surface p-5 ${className}`}>
      {children}
    </div>
  );
}

export function PageTitle({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="mb-5">
      <h1 className="text-2xl font-semibold text-fg">{title}</h1>
      {subtitle && <p className="mt-1 text-sm text-muted">{subtitle}</p>}
    </div>
  );
}

const baseControl =
  "w-full rounded-xl border border-border bg-surface-2 px-3 py-2.5 text-fg placeholder:text-muted outline-none transition focus:border-primary focus:ring-2 focus:ring-ring";

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
    primary: "bg-primary text-primary-fg hover:bg-primary-hover",
    surface: "border border-border bg-surface-2 text-fg hover:bg-border",
    danger: "bg-danger text-primary-fg hover:opacity-90",
    ghost: "text-muted hover:bg-surface-2 hover:text-fg",
  };
  return (
    <button
      {...rest}
      className={`rounded-xl px-4 py-2.5 font-medium transition-colors disabled:opacity-60 ${variants[variant]} ${className}`}
    />
  );
}

export function money(n: number): string {
  return new Intl.NumberFormat(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n);
}
