// Kahoma Type Definitions — all shared interfaces

export type SessionStatus =
  | 'recording'
  | 'processing_chunk'
  | 'awaiting_user'
  | 'generating_book'
  | 'book_ready'
  | 'failed';

export interface Session {
  id: string;
  user_id: string;
  title: string;
  status: SessionStatus;
  phase: number;
  error_message?: string;
  created_at: string;
  updated_at: string;
}

export interface VoiceChunk {
  id: string;
  session_id: string;
  user_id: string;
  audio_url: string;
  transcript: string;
  chunk_order: number;
  whisper_status: string;
  created_at: string;
}

export interface SentimentStore {
  id: string;
  session_id: string;
  sentiment: string;
  tonality: string;
  story_direction: string;
  predicted_future: string;
  confidence_score: number;
  raw_output?: Record<string, unknown>;
  updated_at: string;
}

export interface Entity {
  entity_id: string;
  type: 'character' | 'event' | 'place' | 'era' | 'object';
  name: string;
  user_perspective: string;
  emotional_charge: 'positive' | 'negative' | 'complex' | 'neutral';
  attributes: Record<string, unknown>;
  mentioned_in_chunks?: number[];
}

export interface Relationship {
  from: string;
  to: string;
  type: string;
  narrator_framing: string;
}

export interface EntityStoreData {
  id: string;
  session_id: string;
  entities: Entity[];
  relationships: Relationship[];
  raw_output?: Record<string, unknown>;
  updated_at: string;
}

export interface Character {
  id: string;
  session_id: string;
  name: string;
  relationship_to_narrator: string;
  birth_era: string;
  photo_url: string | null;
  photo_era_transformed_url: string | null;
  photo_requested: boolean;
  created_at: string;
}

export interface ContextMessage {
  id: string;
  session_id: string;
  role: 'user' | 'assistant';
  content: string;
  chunk_id: string | null;
  message_order: number;
  created_at: string;
}

export interface EvaluatorResult {
  overall_score: number;
  dimension_scores?: {
    entity_completeness: number;
    relationship_clarity: number;
    sentiment_confidence: number;
    perspective_accuracy: number;
    story_coherence: number;
  };
  decision: 'acknowledge' | 'ask';
  gaps: string[];
  question_to_ask: string | null;
  catastrophic_gap: boolean;
  new_characters_needing_photo: string[];
}

export interface Chapter {
  id: string;
  session_id: string;
  chapter_number: number;
  title: string;
  era: string;
  location: string;
  transcript_segments: string[];
  content_written: string | null;
  image_url: string | null;
  image_prompt: string | null;
  emotional_arc: string;
  status: string;
  created_at: string;
}

export interface Book {
  id: string;
  session_id: string;
  user_id: string;
  pdf_url: string | null;
  cover_title: string;
  author_name: string;
  status: string;
  page_count: number | null;
  created_at: string;
}

export interface Bible {
  sentimentStore: SentimentStore | null;
  entityStore: EntityStoreData | null;
  contextWindow: ContextMessage[];
  sessionId: string;
}
