'use client';

import { signInAnonymously, onAuthStateChanged, GoogleAuthProvider, signInWithPopup, signOut, updateProfile, type User } from 'firebase/auth';
import { auth } from '@/lib/firebase/config';
import { create } from 'zustand';

interface AuthState {
  user: User | null;
  loading: boolean;
  error: string | null;
  signIn: () => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signOutUser: () => Promise<void>;
  updateAvatar: (photoURL: string) => Promise<void>;
  setUser: (user: User | null) => void;
  setLoading: (loading: boolean) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  loading: true,
  error: null,

  signIn: async () => {
    try {
      set({ loading: true, error: null });
      await signInAnonymously(auth);
    } catch (error) {
      set({ error: (error as Error).message, loading: false });
    }
  },

  signInWithGoogle: async () => {
    try {
      set({ loading: true, error: null });
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
    } catch (error) {
      set({ error: (error as Error).message, loading: false });
    }
  },

  signOutUser: async () => {
    try {
      set({ loading: true, error: null });
      await signOut(auth);
    } catch (error) {
      set({ error: (error as Error).message, loading: false });
    }
  },

  updateAvatar: async (photoURL: string) => {
    try {
      const user = auth.currentUser;
      if (!user) throw new Error("Not logged in");
      await updateProfile(user, { photoURL });
      set({ user: { ...user } as User }); // force update
    } catch (error) {
      set({ error: (error as Error).message });
    }
  },

  setUser: (user) => set({ user, loading: false }),
  setLoading: (loading) => set({ loading }),
}));

// Auth state listener — call once in root layout
export function initAuthListener() {
  return onAuthStateChanged(auth, (user) => {
    useAuthStore.getState().setUser(user);
  });
}
