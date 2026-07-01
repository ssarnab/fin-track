"use client";

import { createContext, useContext, type ReactNode } from "react";
import { useAuth, type Identity } from "@/lib/useAuth";

type AuthContextValue = {
  identity: Identity | null;
  loading: boolean;
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const value = useAuth();
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useIdentity(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useIdentity must be used within AuthProvider");
  return ctx;
}
