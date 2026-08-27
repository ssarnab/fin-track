"use client";

import { useState, type FormEvent } from "react";
import { useIdentity } from "@/lib/AuthProvider";
import ThemeToggle from "@/components/ThemeToggle";
import { Field, Input, Button } from "@/components/ui";

type Mode = "google" | "email";

function friendlyError(e: unknown): string | null {
  const msg = e instanceof Error ? e.message : String(e);
  // A user closing the popup isn't a real error worth shouting about.
  if (msg.includes("popup-closed") || msg.includes("cancelled")) return null;
  if (msg.includes("auth/email-already-in-use")) return "That email is already registered — try signing in instead.";
  if (msg.includes("auth/invalid-credential") || msg.includes("auth/wrong-password")) return "Wrong email or password.";
  if (msg.includes("auth/user-not-found")) return "No account with that email — try creating one.";
  if (msg.includes("auth/weak-password")) return "Password should be at least 6 characters.";
  if (msg.includes("auth/too-many-requests")) return "Too many attempts — please wait a bit and try again.";
  return msg;
}

export default function Login() {
  const { signIn, signUpWithEmail, signInWithEmail, resetPassword } = useIdentity();
  const [mode, setMode] = useState<Mode>("google");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Email
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);
  const [forgotPassword, setForgotPassword] = useState(false);
  const [resetSent, setResetSent] = useState(false);

  async function handleGoogle() {
    setBusy(true);
    setError(null);
    try {
      await signIn();
    } catch (e) {
      setError(friendlyError(e));
    } finally {
      setBusy(false);
    }
  }

  async function handleEmailSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      if (isSignUp) await signUpWithEmail(email, password);
      else await signInWithEmail(email, password);
    } catch (err) {
      setError(friendlyError(err));
    } finally {
      setBusy(false);
    }
  }

  async function handleResetSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await resetPassword(email);
      setResetSent(true);
    } catch (err) {
      setError(friendlyError(err));
    } finally {
      setBusy(false);
    }
  }

  function switchMode(next: Mode) {
    setMode(next);
    setError(null);
    setForgotPassword(false);
    setResetSent(false);
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

        <div className="mb-6 flex gap-1 rounded-xl border border-border bg-surface-2 p-1 text-sm">
          {(["google", "email"] as const).map((m) => (
            <button
              key={m}
              onClick={() => switchMode(m)}
              className={`flex-1 rounded-lg py-1.5 font-medium capitalize transition-colors ${
                mode === m ? "bg-primary text-primary-fg" : "text-muted hover:text-fg"
              }`}
            >
              {m}
            </button>
          ))}
        </div>

        {mode === "google" && (
          <>
            <p className="mb-6 text-sm text-muted">
              Sign in with Google to access your private ledger. Your data is scoped to
              your account only.
            </p>
            <Button
              variant="surface"
              onClick={handleGoogle}
              disabled={busy}
              className="flex w-full items-center justify-center gap-3"
            >
              <GoogleIcon />
              {busy ? "Signing in…" : "Continue with Google"}
            </Button>
          </>
        )}

        {mode === "email" && forgotPassword && (
          <form onSubmit={handleResetSubmit} className="space-y-4">
            <p className="text-sm text-muted">
              Enter your email — if an account exists for it, we&apos;ll send a link to
              reset the password.
            </p>
            <Field label="Email">
              <Input
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
              />
            </Field>
            <Button type="submit" disabled={busy} className="w-full">
              {busy ? "Sending…" : resetSent ? "Email sent again" : "Send reset link"}
            </Button>
            {resetSent && (
              <p className="text-center text-sm text-muted">
                If <span className="text-fg">{email}</span> has an account, a link is on
                its way — check the inbox (and spam folder).
              </p>
            )}
            <button
              type="button"
              onClick={() => {
                setForgotPassword(false);
                setResetSent(false);
                setError(null);
              }}
              className="w-full text-center text-sm text-muted hover:text-fg"
            >
              Back to sign in
            </button>
          </form>
        )}

        {mode === "email" && !forgotPassword && (
          <form onSubmit={handleEmailSubmit} className="space-y-4">
            <Field label="Email">
              <Input
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
              />
            </Field>
            <Field label="Password">
              <Input
                type="password"
                required
                minLength={6}
                autoComplete={isSignUp ? "new-password" : "current-password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
              />
            </Field>
            {!isSignUp && (
              <button
                type="button"
                onClick={() => {
                  setForgotPassword(true);
                  setError(null);
                }}
                className="-mt-2 block text-sm text-muted hover:text-fg"
              >
                Forgot password?
              </button>
            )}
            <Button type="submit" disabled={busy} className="w-full">
              {busy ? "Please wait…" : isSignUp ? "Create account" : "Sign in"}
            </Button>
            <button
              type="button"
              onClick={() => setIsSignUp((v) => !v)}
              className="w-full text-center text-sm text-muted hover:text-fg"
            >
              {isSignUp ? "Already have an account? Sign in" : "New here? Create an account"}
            </button>
          </form>
        )}

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
