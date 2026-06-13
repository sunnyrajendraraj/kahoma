'use client';

import { useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useSessionsStore } from '@/store/sessions';
import type { Session, ContextMessage } from '@/types';
import type { RealtimeChannel } from '@supabase/supabase-js';

export function useSessionStatus(sessionId: string | null) {
  const {
    currentSession,
    messages,
    setCurrentSession,
    updateCurrentSession,
    setMessages,
    addMessage,
    setLoading,
    setError,
  } = useSessionsStore();

  const channelRef = useRef<RealtimeChannel | null>(null);

  const fetchSession = useCallback(async () => {
    if (!sessionId) return;
    setLoading(true);
    try {
      // Fetch session
      const { data: sessionData, error: sessionError } = await supabase
        .from('sessions')
        .select('*')
        .eq('id', sessionId)
        .single();

      if (sessionError) throw sessionError;
      setCurrentSession(sessionData as Session);

      // Fetch messages
      const { data: messagesData, error: messagesError } = await supabase
        .from('context_messages')
        .select('*')
        .eq('session_id', sessionId)
        .order('message_order', { ascending: true });

      if (messagesError) throw messagesError;
      setMessages((messagesData || []) as ContextMessage[]);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load session';
      setError(message);
      console.error('Fetch session error:', err);
    } finally {
      setLoading(false);
    }
  }, [sessionId, setCurrentSession, setMessages, setLoading, setError]);

  useEffect(() => {
    fetchSession();
  }, [fetchSession]);

  // Realtime subscriptions
  useEffect(() => {
    if (!sessionId) return;

    const channel = supabase
      .channel(`session-${sessionId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'sessions',
          filter: `id=eq.${sessionId}`,
        },
        (payload) => {
          const updated = payload.new as Session;
          updateCurrentSession(updated);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'context_messages',
          filter: `session_id=eq.${sessionId}`,
        },
        (payload) => {
          const newMessage = payload.new as ContextMessage;
          addMessage(newMessage);
        }
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [sessionId, updateCurrentSession, addMessage]);

  return {
    session: currentSession,
    messages,
    loading: useSessionsStore.getState().loading,
    error: useSessionsStore.getState().error,
    refetch: fetchSession,
  };
}
