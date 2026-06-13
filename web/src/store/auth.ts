'use client';

import { create } from 'zustand';
import { supabase } from '@/lib/supabase';
import type { User, Session as SupabaseSession } from '@supabase/supabase-js';

interface AuthState {
  user: User | null;
  session: SupabaseSession | null;
  loading: boolean;
  initialized: boolean;
  isOnboarded: boolean;
  setUser: (user: User | null) => void;
  setSession: (session: SupabaseSession | null) => void;
  setLoading: (loading: boolean) => void;
  setInitialized: (initialized: boolean) => void;
  setOnboarded: (onboarded: boolean) => void;
  initialize: () => Promise<void>;
  signOut: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  session: null,
  loading: true,
  initialized: false,
  isOnboarded: false,

  setUser: (user) => set({ user }),
  setSession: (session) => set({ session }),
  setLoading: (loading) => set({ loading }),
  setInitialized: (initialized) => set({ initialized }),
  setOnboarded: (onboarded) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('kahoma_onboarded', String(onboarded));
    }
    set({ isOnboarded: onboarded });
  },

  initialize: async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const onboarded = typeof window !== 'undefined'
        ? localStorage.getItem('kahoma_onboarded') === 'true'
        : false;

      set({
        session,
        user: session?.user ?? null,
        loading: false,
        initialized: true,
        isOnboarded: onboarded,
      });

      supabase.auth.onAuthStateChange((_event, session) => {
        set({
          session,
          user: session?.user ?? null,
        });
      });
    } catch (error) {
      console.error('Auth initialization error:', error);
      set({ loading: false, initialized: true });
    }
  },

  signOut: async () => {
    await supabase.auth.signOut();
    if (typeof window !== 'undefined') {
      localStorage.removeItem('kahoma_onboarded');
    }
    set({
      user: null,
      session: null,
      isOnboarded: false,
    });
  },
}));
