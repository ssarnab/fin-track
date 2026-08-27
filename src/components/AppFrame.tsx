"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { AuthProvider, useIdentity } from "@/lib/AuthProvider";
import Login from "@/components/Login";
import VerifyEmail from "@/components/VerifyEmail";
import NavBar from "@/components/NavBar";

function Gate({ children }: { children: ReactNode }) {
  const { identity, loading } = useIdentity();
  const pathname = usePathname();

  // Password-reset / email-verify links land here with no session (or a
  // stale one) — it manages its own state via the oobCode, so it must
  // render outside the sign-in gate.
  if (pathname === "/auth/action") return <>{children}</>;

  if (loading) {
    return (
      <div className="grid min-h-dvh place-items-center bg-bg">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-border border-t-primary" />
      </div>
    );
  }

  if (!identity) return <Login />;

  // Google accounts arrive pre-verified; only email/password sign-ups land here.
  if (!identity.emailVerified) return <VerifyEmail />;

  return (
    <div className="flex min-h-dvh flex-col">
      <NavBar />
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-6">{children}</main>
    </div>
  );
}

export default function AppFrame({ children }: { children: ReactNode }) {
  return (
    <AuthProvider>
      <Gate>{children}</Gate>
    </AuthProvider>
  );
}
