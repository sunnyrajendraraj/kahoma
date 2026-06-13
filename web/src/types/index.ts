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

export interface ContextMessage {
  id: string;
  session_id: string;
  role: 'user' | 'assistant';
  content: string;
  chunk_id: string | null;
  message_order: number;
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

export interface Chapter {
  id: string;
  session_id: string;
  chapter_number: number;
  title: string;
  era: string;
  location: string;
  content_written: string | null;
  status: string;
  created_at: string;
}

export interface UserProfile {
  id: string;
  email: string;
  full_name?: string;
  avatar_url?: string;
  created_at: string;
}
