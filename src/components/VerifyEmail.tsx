"use client";

import { useState } from "react";
import { useIdentity } from "@/lib/AuthProvider";
import ThemeToggle from "@/components/ThemeToggle";
import { Button } from "@/components/ui";

export default function VerifyEmail() {
  const { identity, resendVerificationEmail, refreshIdentity, signOut } = useIdentity();
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleResend() {
    setBusy(true);
    setError(null);
    try {
      await resendVerificationEmail();
      setSent(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't send the email — try again.");
    } finally {
      setBusy(false);
    }
  }

  async function handleRefresh() {
    setBusy(true);
    setError(null);
    try {
      await refreshIdentity();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't check your status — try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="relative flex min-h-dvh items-center justify-center bg-bg px-4">
      <div className="absolute right-4 top-4">
        <ThemeToggle />
      </div>

      <div className="w-full max-w-sm rounded-2xl border border-border bg-surface p-8 shadow-xl text-center">
        <div className="mx-auto mb-4 grid h-11 w-11 place-items-center rounded-xl bg-primary text-primary-fg font-semibold text-lg">
          ৳
        </div>
        <h1 className="text-xl font-semibold tracking-tight text-fg">Verify your email</h1>
        <p className="mt-2 text-sm text-muted">
          We sent a verification link to <span className="text-fg">{identity?.email}</span>.
          Click it, then come back here.
        </p>

        <div className="mt-6 space-y-3">
          <Button onClick={handleRefresh} disabled={busy} className="w-full">
            {busy ? "Checking…" : "I've verified — Refresh"}
          </Button>
          <Button variant="surface" onClick={handleResend} disabled={busy} className="w-full">
            {sent ? "Email sent again" : "Resend email"}
          </Button>
          <button
            onClick={() => signOut()}
            className="w-full text-center text-sm text-muted hover:text-fg"
          >
            Sign out
          </button>
        </div>

        {error && (
          <p className="mt-4 rounded-lg border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-danger">
            {error}
          </p>
        )}
      </div>
    </div>
  );
}
