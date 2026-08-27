"use client";

import { useEffect, useState, useCallback } from "react";
import {
  onAuthStateChanged,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendEmailVerification,
  sendPasswordResetEmail,
  signOut as fbSignOut,
  type User,
} from "firebase/auth";
import { auth, googleProvider } from "@/lib/firebase";

export type Identity = {
  uid: string;
  name: string;
  photo: string | null;
  email: string | null;
  emailVerified: boolean;
};

function toIdentity(user: User | null): Identity | null {
  if (!user) return null;
  return {
    uid: user.uid,
    name: user.displayName ?? user.email ?? "User",
    photo: user.photoURL,
    email: user.email,
    emailVerified: user.emailVerified,
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

  const signUpWithEmail = useCallback(async (email: string, password: string) => {
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    // `url` puts a "Continue" link on Firebase's hosted verification page,
    // pointing back at this app instead of leaving the user stranded there.
    await sendEmailVerification(cred.user, { url: window.location.origin });
    setIdentity(toIdentity(cred.user));
  }, []);

  const signInWithEmail = useCallback(async (email: string, password: string) => {
    await signInWithEmailAndPassword(auth, email, password);
  }, []);

  const resetPassword = useCallback(async (email: string) => {
    await sendPasswordResetEmail(auth, email, { url: window.location.origin });
  }, []);

  const resendVerificationEmail = useCallback(async () => {
    if (!auth.currentUser) throw new Error("Not signed in.");
    await sendEmailVerification(auth.currentUser, { url: window.location.origin });
  }, []);

  // Firebase's `user.emailVerified` is a snapshot from when the ID token was
  // issued — it won't update on its own after the user clicks the link in
  // their inbox, so this re-fetches the user and re-syncs local state.
  const refreshIdentity = useCallback(async () => {
    if (!auth.currentUser) return;
    await auth.currentUser.reload();
    setIdentity(toIdentity(auth.currentUser));
  }, []);

  const signOut = useCallback(async () => {
    await fbSignOut(auth);
  }, []);

  return {
    identity,
    loading,
    signIn,
    signUpWithEmail,
    signInWithEmail,
    resetPassword,
    resendVerificationEmail,
    refreshIdentity,
    signOut,
  };
}
