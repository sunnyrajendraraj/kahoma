'use client';

import { create } from 'zustand';
import type { Session, ContextMessage } from '@/types';

interface SessionsState {
  sessions: Session[];
  currentSession: Session | null;
  messages: ContextMessage[];
  loading: boolean;
  error: string | null;

  setSessions: (sessions: Session[]) => void;
  setCurrentSession: (session: Session | null) => void;
  updateCurrentSession: (updates: Partial<Session>) => void;
  setMessages: (messages: ContextMessage[]) => void;
  addMessage: (message: ContextMessage) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  reset: () => void;
}

export const useSessionsStore = create<SessionsState>((set, get) => ({
  sessions: [],
  currentSession: null,
  messages: [],
  loading: false,
  error: null,

  setSessions: (sessions) => set({ sessions }),

  setCurrentSession: (session) => set({ currentSession: session }),

  updateCurrentSession: (updates) => {
    const current = get().currentSession;
    if (current) {
      const updated = { ...current, ...updates };
      set({ currentSession: updated });
      // Also update in the sessions list
      const sessions = get().sessions.map((s) =>
        s.id === current.id ? updated : s
      );
      set({ sessions });
    }
  },

  setMessages: (messages) =>
    set({ messages: [...messages].sort((a, b) => a.message_order - b.message_order) }),

  addMessage: (message) => {
    const existing = get().messages;
    // Avoid duplicates
    if (existing.find((m) => m.id === message.id)) return;
    const updated = [...existing, message].sort(
      (a, b) => a.message_order - b.message_order
    );
    set({ messages: updated });
  },

  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),

  reset: () =>
    set({
      sessions: [],
      currentSession: null,
      messages: [],
      loading: false,
      error: null,
    }),
}));
