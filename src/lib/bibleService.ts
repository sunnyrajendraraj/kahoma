import { supabase } from './supabase';
import type { Bible, SentimentStore, EntityStoreData, ContextMessage } from '../types';

/**
 * Assemble the Bible — the combined knowledge base used by Phase 2 agents.
 * Bible = Sentiment Store + Entity Store + Context Window
 */
export async function assembleBible(sessionId: string): Promise<Bible> {
  // Fetch all three stores in parallel
  const [sentimentResult, entityResult, messagesResult] = await Promise.all([
    supabase
      .from('sentiment_store')
      .select('*')
      .eq('session_id', sessionId)
      .single(),
    supabase
      .from('entity_store')
      .select('*')
      .eq('session_id', sessionId)
      .single(),
    supabase
      .from('context_messages')
      .select('*')
      .eq('session_id', sessionId)
      .order('message_order', { ascending: true }),
  ]);

  const sentimentStore: SentimentStore | null = sentimentResult.data ?? null;
  const entityStore: EntityStoreData | null = entityResult.data ?? null;
  const contextWindow: ContextMessage[] = messagesResult.data ?? [];

  return {
    sentimentStore,
    entityStore,
    contextWindow,
    sessionId,
  };
}
