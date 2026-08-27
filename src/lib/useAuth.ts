"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import {
  onAuthStateChanged,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPhoneNumber,
  RecaptchaVerifier,
  signOut as fbSignOut,
  type User,
  type ConfirmationResult,
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
    name: user.displayName ?? user.email ?? user.phoneNumber ?? "User",
    photo: user.photoURL,
    email: user.email,
  };
}

export function useAuth() {
  const [identity, setIdentity] = useState<Identity | null>(null);
  const [loading, setLoading] = useState(true);

  // Kept across renders, not in state — they're not meant to trigger re-renders.
  const recaptchaRef = useRef<RecaptchaVerifier | null>(null);
  const confirmationRef = useRef<ConfirmationResult | null>(null);

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
    await createUserWithEmailAndPassword(auth, email, password);
  }, []);

  const signInWithEmail = useCallback(async (email: string, password: string) => {
    await signInWithEmailAndPassword(auth, email, password);
  }, []);

  // `containerId` is an invisible <div id="..."> already mounted in the DOM —
  // Firebase renders its challenge into it only if it ever needs to.
  const sendPhoneOtp = useCallback(async (phoneNumber: string, containerId: string) => {
    if (!recaptchaRef.current) {
      recaptchaRef.current = new RecaptchaVerifier(auth, containerId, {
        size: "invisible",
      });
    }
    confirmationRef.current = await signInWithPhoneNumber(
      auth,
      phoneNumber,
      recaptchaRef.current
    );
  }, []);

  const confirmPhoneOtp = useCallback(async (code: string) => {
    if (!confirmationRef.current) {
      throw new Error("Request an OTP first.");
    }
    await confirmationRef.current.confirm(code);
    confirmationRef.current = null;
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
    sendPhoneOtp,
    confirmPhoneOtp,
    signOut,
  };
}
