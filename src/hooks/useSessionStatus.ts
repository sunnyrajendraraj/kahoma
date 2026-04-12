import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import type { Session, ContextMessage } from '../types';
import type { RealtimeChannel } from '@supabase/supabase-js';

export function useSessionStatus(sessionId: string | undefined) {
  const [session, setSession] = useState<Session | null>(null);
  const [messages, setMessages] = useState<ContextMessage[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch initial data
  const fetchData = useCallback(async () => {
    if (!sessionId) return;

    setLoading(true);
    const [sessionResult, messagesResult] = await Promise.all([
      supabase.from('sessions').select('*').eq('id', sessionId).single(),
      supabase
        .from('context_messages')
        .select('*')
        .eq('session_id', sessionId)
        .order('message_order', { ascending: true }),
    ]);

    if (sessionResult.data) setSession(sessionResult.data as Session);
    if (messagesResult.data) setMessages(messagesResult.data as ContextMessage[]);
    setLoading(false);
  }, [sessionId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Subscribe to real-time changes
  useEffect(() => {
    if (!sessionId) return;

    const channels: RealtimeChannel[] = [];

    // Listen for session status changes
    const sessionChannel = supabase
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
          setSession(payload.new as Session);
        }
      )
      .subscribe();
    channels.push(sessionChannel);

    // Listen for new context messages
    const messagesChannel = supabase
      .channel(`messages-${sessionId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'context_messages',
          filter: `session_id=eq.${sessionId}`,
        },
        (payload) => {
          setMessages((prev) => [...prev, payload.new as ContextMessage]);
        }
      )
      .subscribe();
    channels.push(messagesChannel);

    return () => {
      channels.forEach((ch) => supabase.removeChannel(ch));
    };
  }, [sessionId]);

  return { session, messages, loading, refetch: fetchData };
}
