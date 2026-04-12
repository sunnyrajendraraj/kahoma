import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import type { Session } from '../types';

interface SessionsState {
  sessions: Session[];
  loading: boolean;
  fetchSessions: (userId: string) => Promise<void>;
}

export const useSessionsStore = create<SessionsState>((set) => ({
  sessions: [],
  loading: false,

  fetchSessions: async (userId: string) => {
    set({ loading: true });
    const { data, error } = await supabase
      .from('sessions')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(20);

    if (error) {
      console.error('Failed to fetch sessions:', error.message);
      set({ loading: false });
      return;
    }

    set({ sessions: (data ?? []) as Session[], loading: false });
  },
}));
