import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import type { Session as SupabaseSession, User } from '@supabase/supabase-js';

interface AuthState {
  user: User | null;
  session: SupabaseSession | null;
  loading: boolean;
  initialized: boolean;
  initialize: () => void;
  sendOTP: (email: string) => Promise<void>;
  verifyOTP: (email: string, token: string) => Promise<void>;
  signOut: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  session: null,
  loading: false,
  initialized: false,

  initialize: () => {
    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        set({
          user: session?.user ?? null,
          session: session ?? null,
          initialized: true,
          loading: false,
        });
      }
    );

    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      set({
        user: session?.user ?? null,
        session: session ?? null,
        initialized: true,
      });
    });

    // Return cleanup function (store it if needed)
    return () => subscription.unsubscribe();
  },

  sendOTP: async (email: string) => {
    set({ loading: true });
    const { error } = await supabase.auth.signInWithOtp({ email });
    set({ loading: false });
    if (error) throw new Error(error.message);
  },

  verifyOTP: async (email: string, token: string) => {
    set({ loading: true });
    const { error } = await supabase.auth.verifyOtp({
      email,
      token,
      type: 'email',
    });
    set({ loading: false });
    if (error) throw new Error(error.message);
  },

  signOut: async () => {
    set({ loading: true });
    const { error } = await supabase.auth.signOut();
    set({ user: null, session: null, loading: false });
    if (error) throw new Error(error.message);
  },
}));
