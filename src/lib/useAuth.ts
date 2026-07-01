"use client";

import { useEffect, useState, useCallback } from "react";
import {
  onAuthStateChanged,
  signInWithPopup,
  signOut as fbSignOut,
  type User,
} from "firebase/auth";
import { auth, googleProvider } from "@/lib/firebase";

export type Identity = {
  uid: string;
  name: string;
  photo: string | null;
  email: string | null;
};

function toIdentity(user: User | null): Identity | null {
  if (!user) return null;
  return {
    uid: user.uid,
    name: user.displayName ?? "User",
    photo: user.photoURL,
    email: user.email,
  };
}

export function useAuth() {
  const [identity, setIdentity] = useState<Identity | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      setIdentity(toIdentity(user));
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const signIn = useCallback(async () => {
    await signInWithPopup(auth, googleProvider);
  }, []);

  const signOut = useCallback(async () => {
    await fbSignOut(auth);
  }, []);

  return { identity, loading, signIn, signOut };
}
