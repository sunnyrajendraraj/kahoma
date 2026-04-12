-- Kahoma Database Migration — Complete Schema
-- Run in Supabase SQL Editor

-- 1. SESSIONS
CREATE TABLE sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  title text DEFAULT 'My Story',
  status text DEFAULT 'recording',
  phase integer DEFAULT 1,
  error_message text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 2. VOICE_CHUNKS
CREATE TABLE voice_chunks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid REFERENCES sessions ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users,
  audio_url text,
  transcript text,
  chunk_order integer NOT NULL,
  whisper_status text DEFAULT 'pending',
  created_at timestamptz DEFAULT now()
);

-- 3. SENTIMENT_STORE (one row per session, always UPSERT)
CREATE TABLE sentiment_store (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid UNIQUE REFERENCES sessions ON DELETE CASCADE,
  sentiment text,
  tonality text,
  story_direction text,
  predicted_future text,
  confidence_score integer,
  raw_output jsonb DEFAULT '{}',
  updated_at timestamptz DEFAULT now()
);

-- 4. ENTITY_STORE (one row per session, always UPSERT)
CREATE TABLE entity_store (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid UNIQUE REFERENCES sessions ON DELETE CASCADE,
  entities jsonb DEFAULT '[]',
  relationships jsonb DEFAULT '[]',
  raw_output jsonb DEFAULT '{}',
  updated_at timestamptz DEFAULT now()
);

-- 5. CONTEXT_MESSAGES (append only, full conversation log)
CREATE TABLE context_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid REFERENCES sessions ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('user', 'assistant')),
  content text NOT NULL,
  chunk_id uuid REFERENCES voice_chunks,
  message_order integer,
  created_at timestamptz DEFAULT now()
);

-- 6. CHARACTERS
CREATE TABLE characters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid REFERENCES sessions ON DELETE CASCADE,
  name text NOT NULL,
  relationship_to_narrator text,
  birth_era text,
  photo_url text,
  photo_era_transformed_url text,
  photo_requested boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- 7. CHAPTERS
CREATE TABLE chapters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid REFERENCES sessions ON DELETE CASCADE,
  chapter_number integer NOT NULL,
  title text,
  era text,
  location text,
  transcript_segments jsonb DEFAULT '[]',
  content_written text,
  image_url text,
  image_prompt text,
  emotional_arc text,
  status text DEFAULT 'pending',
  created_at timestamptz DEFAULT now()
);

-- 8. BOOKS
CREATE TABLE books (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid UNIQUE REFERENCES sessions ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users,
  pdf_url text,
  cover_title text,
  author_name text,
  status text DEFAULT 'pending',
  page_count integer,
  created_at timestamptz DEFAULT now()
);

-- 9. PROCESSING_LOG
CREATE TABLE processing_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid,
  chunk_id uuid,
  event text,
  data jsonb,
  created_at timestamptz DEFAULT now()
);

-- INDEXES
CREATE INDEX idx_sessions_user ON sessions(user_id);
CREATE INDEX idx_voice_chunks_session ON voice_chunks(session_id);
CREATE INDEX idx_context_messages_session ON context_messages(session_id);
CREATE INDEX idx_chapters_session ON chapters(session_id);

-- UPDATED_AT TRIGGER
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER sessions_updated_at
  BEFORE UPDATE ON sessions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER sentiment_store_updated_at
  BEFORE UPDATE ON sentiment_store
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER entity_store_updated_at
  BEFORE UPDATE ON entity_store
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- RLS: Enable on all tables
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE voice_chunks ENABLE ROW LEVEL SECURITY;
ALTER TABLE sentiment_store ENABLE ROW LEVEL SECURITY;
ALTER TABLE entity_store ENABLE ROW LEVEL SECURITY;
ALTER TABLE context_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE characters ENABLE ROW LEVEL SECURITY;
ALTER TABLE chapters ENABLE ROW LEVEL SECURITY;
ALTER TABLE books ENABLE ROW LEVEL SECURITY;

-- RLS POLICIES (user can only access their own data)
CREATE POLICY "own_sessions" ON sessions FOR ALL
  USING (auth.uid() = user_id);

CREATE POLICY "own_chunks" ON voice_chunks FOR ALL
  USING (auth.uid() = user_id);

CREATE POLICY "own_sentiment" ON sentiment_store FOR ALL
  USING (session_id IN (SELECT id FROM sessions WHERE user_id = auth.uid()));

CREATE POLICY "own_entities" ON entity_store FOR ALL
  USING (session_id IN (SELECT id FROM sessions WHERE user_id = auth.uid()));

CREATE POLICY "own_messages" ON context_messages FOR ALL
  USING (session_id IN (SELECT id FROM sessions WHERE user_id = auth.uid()));

CREATE POLICY "own_characters" ON characters FOR ALL
  USING (session_id IN (SELECT id FROM sessions WHERE user_id = auth.uid()));

CREATE POLICY "own_chapters" ON chapters FOR ALL
  USING (session_id IN (SELECT id FROM sessions WHERE user_id = auth.uid()));

CREATE POLICY "own_books" ON books FOR ALL
  USING (auth.uid() = user_id);

-- REALTIME: Enable on key tables
ALTER PUBLICATION supabase_realtime ADD TABLE sessions;
ALTER PUBLICATION supabase_realtime ADD TABLE context_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE chapters;
ALTER PUBLICATION supabase_realtime ADD TABLE books;

-- STORAGE BUCKETS (create these in Supabase Dashboard → Storage):
-- "audio"  — private, 200MB max per file
-- "photos" — private, 20MB max per file
-- "books"  — private, 50MB max per file
