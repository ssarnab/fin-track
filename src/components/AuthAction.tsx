"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  verifyPasswordResetCode,
  confirmPasswordReset,
  applyActionCode,
} from "firebase/auth";
import { auth } from "@/lib/firebase";
import ThemeToggle from "@/components/ThemeToggle";
import { Field, Input, Button } from "@/components/ui";

type Status = "checking" | "ready" | "done" | "invalid";

function friendlyError(e: unknown): string {
  const msg = e instanceof Error ? e.message : String(e);
  if (msg.includes("auth/weak-password")) return "Password should be at least 6 characters.";
  if (msg.includes("auth/expired-action-code")) return "This link has expired — request a new one.";
  if (msg.includes("auth/invalid-action-code")) return "This link is invalid or has already been used.";
  return msg;
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative flex min-h-dvh items-center justify-center bg-bg px-4">
      <div className="absolute right-4 top-4">
        <ThemeToggle />
      </div>
      <div className="w-full max-w-sm rounded-2xl border border-border bg-surface p-8 shadow-xl text-center">
        <div className="mx-auto mb-4 grid h-11 w-11 place-items-center rounded-xl bg-primary text-primary-fg font-semibold text-lg">
          ৳
        </div>
        {children}
      </div>
    </div>
  );
}

function BackToApp({ label }: { label: string }) {
  return (
    <Link
      href="/"
      className="mt-6 block w-full rounded-xl bg-primary px-4 py-2.5 text-center font-medium text-primary-fg transition-colors hover:bg-primary-hover"
    >
      {label}
    </Link>
  );
}

function ResetPasswordAction({ oobCode }: { oobCode: string }) {
  const [status, setStatus] = useState<Status>("checking");
  const [email, setEmail] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    verifyPasswordResetCode(auth, oobCode)
      .then((addr) => {
        setEmail(addr);
        setStatus("ready");
      })
      .catch((e) => {
        setError(friendlyError(e));
        setStatus("invalid");
      });
  }, [oobCode]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await confirmPasswordReset(auth, oobCode, password);
      setStatus("done");
    } catch (err) {
      setError(friendlyError(err));
    } finally {
      setBusy(false);
    }
  }

  if (status === "checking") {
    return (
      <p className="mt-2 text-sm text-muted">Checking your link…</p>
    );
  }

  if (status === "invalid") {
    return (
      <>
        <h1 className="text-xl font-semibold tracking-tight text-fg">Link expired</h1>
        <p className="mt-2 text-sm text-muted">{error}</p>
        <BackToApp label="Back to sign in" />
      </>
    );
  }

  if (status === "done") {
    return (
      <>
        <h1 className="text-xl font-semibold tracking-tight text-fg">Password updated</h1>
        <p className="mt-2 text-sm text-muted">You can now sign in with your new password.</p>
        <BackToApp label="Continue to FinTrack" />
      </>
    );
  }

  return (
    <>
      <h1 className="text-xl font-semibold tracking-tight text-fg">Set a new password</h1>
      <p className="mt-2 text-sm text-muted">for {email}</p>
      <form onSubmit={handleSubmit} className="mt-6 space-y-4 text-left">
        <Field label="New password">
          <Input
            type="password"
            required
            minLength={6}
            autoComplete="new-password"
            autoFocus
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
          />
        </Field>
        <Button type="submit" disabled={busy} className="w-full">
          {busy ? "Updating…" : "Update password"}
        </Button>
      </form>
      {error && (
        <p className="mt-4 rounded-lg border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-danger">
          {error}
        </p>
      )}
    </>
  );
}

function VerifyEmailAction({ oobCode }: { oobCode: string }) {
  const [status, setStatus] = useState<Status>("checking");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    applyActionCode(auth, oobCode)
      .then(() => setStatus("done"))
      .catch((e) => {
        setError(friendlyError(e));
        setStatus("invalid");
      });
  }, [oobCode]);

  if (status === "checking") {
    return <p className="mt-2 text-sm text-muted">Verifying your email…</p>;
  }

  if (status === "invalid") {
    return (
      <>
        <h1 className="text-xl font-semibold tracking-tight text-fg">Link expired</h1>
        <p className="mt-2 text-sm text-muted">{error}</p>
        <BackToApp label="Back to sign in" />
      </>
    );
  }

  return (
    <>
      <h1 className="text-xl font-semibold tracking-tight text-fg">Email verified</h1>
      <p className="mt-2 text-sm text-muted">Your address is confirmed — you&apos;re all set.</p>
      <BackToApp label="Continue to FinTrack" />
    </>
  );
}

export default function AuthAction() {
  const params = useSearchParams();
  const mode = params.get("mode");
  const oobCode = params.get("oobCode");

  let body: React.ReactNode;
  if (!oobCode || (mode !== "resetPassword" && mode !== "verifyEmail")) {
    body = (
      <>
        <h1 className="text-xl font-semibold tracking-tight text-fg">Invalid link</h1>
        <p className="mt-2 text-sm text-muted">This link is missing or malformed.</p>
        <BackToApp label="Back to sign in" />
      </>
    );
  } else if (mode === "resetPassword") {
    body = <ResetPasswordAction oobCode={oobCode} />;
  } else {
    body = <VerifyEmailAction oobCode={oobCode} />;
  }

  return <Shell>{body}</Shell>;
}
