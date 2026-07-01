"use client";

import { useState } from "react";
import { useIdentity } from "@/lib/AuthProvider";
import ThemeToggle from "@/components/ThemeToggle";

export default function Login() {
  const { signIn } = useIdentity();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handle() {
    setBusy(true);
    setError(null);
    try {
      await signIn();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Sign-in failed";
      // A user closing the popup isn't a real error worth shouting about.
      if (!msg.includes("popup-closed") && !msg.includes("cancelled")) setError(msg);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="relative flex min-h-dvh items-center justify-center bg-bg px-4">
      <div className="absolute right-4 top-4">
        <ThemeToggle />
      </div>

      <div className="w-full max-w-sm rounded-2xl border border-border bg-surface p-8 shadow-xl">
        <div className="mb-6 flex items-center gap-3">
          <div className="grid h-11 w-11 place-items-center rounded-xl bg-primary text-primary-fg font-semibold text-lg">
            ৳
          </div>
          <div>
            <h1 className="text-xl font-semibold tracking-tight text-fg">FinTrack</h1>
            <p className="text-sm text-muted">Track your day-to-day balance</p>
          </div>
        </div>

        <p className="mb-6 text-sm text-muted">
          Sign in with Google to access your private ledger. Your data is scoped to
          your account only.
        </p>

        <button
          onClick={handle}
          disabled={busy}
          className="flex w-full items-center justify-center gap-3 rounded-xl border border-border bg-surface-2 px-4 py-3 font-medium text-fg transition-colors hover:bg-border disabled:opacity-60"
        >
          <GoogleIcon />
          {busy ? "Signing in…" : "Continue with Google"}
        </button>

        {error && (
          <p className="mt-4 rounded-lg border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-danger">
            {error}
          </p>
        )}
      </div>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.1a6.6 6.6 0 0 1 0-4.2V7.06H2.18a11 11 0 0 0 0 9.88l3.66-2.84z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1a11 11 0 0 0-9.82 6.06l3.66 2.84C6.71 7.3 9.14 5.38 12 5.38z" />
    </svg>
  );
}
