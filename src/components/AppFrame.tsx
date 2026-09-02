"use client";

import type { ReactNode } from "react";
import { AuthProvider, useIdentity } from "@/lib/AuthProvider";
import Login from "@/components/Login";
import VerifyEmail from "@/components/VerifyEmail";
import Sidebar from "@/components/Sidebar";

function Gate({ children }: { children: ReactNode }) {
  const { identity, loading } = useIdentity();

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
    <div className="flex min-h-dvh md:flex-row flex-col">
      <Sidebar />
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-6 md:px-8 md:py-8">{children}</main>
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
