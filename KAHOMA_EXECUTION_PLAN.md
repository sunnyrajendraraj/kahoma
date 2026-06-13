# KAHOMA — COMPLETE EXECUTION PLAN
### Zero-to-Ship · Multi-Agent AI System · Full Stack Implementation
> Give this to your AI coding agent. Tell it to implement everything in order. Do not skip steps.

---

## WHAT YOU ARE BUILDING

**Kahoma** is a voice-first memoir platform. Users speak their life stories in any language. A 6-agent AI pipeline listens in real time, extracts meaning, and generates a beautifully formatted PDF book — chapters, era-transformed photos, literary prose — that surprises the user with how deeply it understood them.

**The surprise is the product.**

---

## IRON LAWS — NEVER BREAK THESE

Before the agent writes a single line of code, embed these rules in every session:

1. **Architecture before code.** Design the plan first. Approve it. Then code.
2. **One feature per prompt.** One agent, one function, one screen per session.
3. **Git commit before every AI edit.** Always. No exceptions.
4. **CONTEXT.md first, every single session.** No context = hallucinations.
5. **Paste actual code, never describe it.** Show the function, not a summary.
6. **Constrain what must not change.** Every edit prompt must list "Do NOT touch: X, Y, Z."
7. **Fresh context every 10–15 exchanges.** Long contexts degrade output quality.
8. **Test every agent in isolation before chaining.**
9. **Log everything during development.** Silent failures in multi-agent pipelines are catastrophic.
10. **No API keys in code. Ever.** Supabase secrets only.
11. **After complex output: ask AI to review itself.** "Does this reference anything not in context? Fix it."
12. **Build → Harden → Polish as separate passes.** Working code first. Errors second. Design last.

---

## TECH STACK — NEVER SUGGEST ALTERNATIVES

| Layer | Technology |
|---|---|
| Mobile App | React Native + Expo SDK 51, Expo Router v3, TypeScript |
| Auth | Supabase Phone OTP |
| Backend | Supabase (Postgres + Storage + Edge Functions + Realtime) |
| All AI Agents | Claude API `claude-sonnet-4-5` via Supabase Edge Functions (Deno) |
| Audio Transcription | OpenAI Whisper API (`whisper-1`) |
| Image Generation | Replicate (`stability-ai/sdxl`) — img2img + text-to-image |
| PDF Generation | PDFShift API |
| State Management | Zustand |
| Agent Orchestration | Supabase Edge Functions (Deno), chained via `fetch()` |

---

## CONTEXT.md — CREATE THIS FIRST, PASTE IN EVERY SESSION

```markdown
# Kahoma — Project Context (PASTE THIS FIRST IN EVERY SESSION)

## What Kahoma Does
Kahoma is a voice-first storytelling platform. Users record raw voice stories
in any language. A 6-agent AI pipeline listens, extracts meaning with minimal
interruption, and produces a beautifully formatted PDF book — chapters, images,
and all — that surprises the user with how much it understood from so little.

## The 6 Agents
Phase 1 (Real-time, per chunk):
  S-Agent: Sentiment, tonality, direction, predicted future of story
  E-Agent: Entity extraction — characters, events, places, eras, user perspective on each
  Evaluator: Scores S+E outputs against transcript context (threshold: 80)
  Clarification Agent: If score < 80 → ask specific questions. If ≥ 80 → acknowledge.

Phase 2 (On "Generate My Book"):
  Breaker Agent: Reads the Bible, breaks story into optimal chapters (thinks like Premchand)
  Proxy Writer: Rewrites each chapter as a 40-year experienced literary writer
  Picasso Agent: Generates image prompts per chapter, transforms user photos to era
  Binder Agent: Assembles chapters + images → final PDF book

## The Bible (3 Memory Stores Combined)
1. Sentiment Store (S): Updated after each chunk — latest sentiment wins
2. Entity Store (E): Updated after each chunk — characters, events, places, relationships, user perspective
3. Context Window: Conversation history (user transcript + clarification agent messages)
Bible = S + E + Context → used by Phase 2 agents

## Tech Stack (NEVER suggest alternatives)
- Mobile: React Native + Expo SDK 51, Expo Router v3, TypeScript
- Auth: Supabase Phone OTP
- Backend: Supabase (Postgres, Storage, Edge Functions, Realtime)
- All AI Agents: Claude API (claude-sonnet-4-5) via Supabase Edge Functions
- Audio Transcription: OpenAI Whisper API
- Image Generation/Transformation: Replicate (SDXL img2img + text-to-image)
- PDF Generation: PDFShift API
- State Management: Zustand
- Agent Orchestration: Supabase Edge Functions (Deno)

## Supabase Project
URL: [YOUR_SUPABASE_URL]
Anon Key: [YOUR_ANON_KEY]

## File Structure
[PASTE ACTUAL TREE — update after each phase]

## Database Schema
[PASTE SCHEMA — from Phase 2]

## Current Working Features
[UPDATE after each phase]

## Current Task
[SPECIFIC TASK FOR THIS SESSION]

## AI Rules for All Sessions
- TypeScript only. No 'any'. All errors must be handled explicitly.
- Supabase client always from src/lib/supabase.ts
- Never rewrite files I haven't asked you to touch
- After every change: list exactly what files changed and why
- When unsure about an API: ask, don't invent
```

---

## SYSTEM ARCHITECTURE

### Phase 1 — Real-Time Loop (runs on every voice chunk)

```
User records chunk → Whisper transcribes → Context Window appended
                                                    ↓
                            ┌───────────────────────┤
                            ↓                       ↓
                        S-Agent                 E-Agent          ← PARALLEL
                     (Sentiment)             (Entities)
                            ↓                       ↓
                            └───────────────────────┘
                                        ↓
                                   Evaluator
                              (Score 0-100, threshold 80)
                                        ↓
                           ┌────────────┴────────────┐
                       score ≥ 80               score < 80
                           ↓                         ↓
                    Acknowledge user         Ask 1 specific question
                           ↓                         ↓
                    Sentiment Store ← updated after each chunk
                    Entity Store    ← enriched after each chunk
                    Context Window  ← appended (never overwritten)
                           ↓
                  User continues → loop repeats
```

### Phase 2 — Book Generation (triggered by "Generate My Book")

```
Bible = Sentiment Store + Entity Store + Context Window
    ↓
Breaker Agent → chapter structure (JSON with titles, eras, transcript segments)
    ↓
Proxy Writer → literary prose per chapter (runs sequentially per chapter)
    ↓
Picasso Agent → era-transform user photos + generate illustrations (Replicate)
    ↓
Binder Agent → assemble HTML → PDFShift API → PDF stored in Supabase
    ↓
session.status = 'book_ready' → user sees book
```

### 3 Memory Stores

| Store | Content | Behavior | Used By |
|---|---|---|---|
| Sentiment Store | sentiment, tonality, direction, predicted future | UPDATE (latest wins) | Evaluator, Bible, Breaker |
| Entity Store | characters, relationships, events, places, eras, user perspective | UPDATE (enrich, don't duplicate) | Evaluator, Picasso, Breaker, Proxy Writer |
| Context Window | full conversation: user chunks + clarification messages | APPEND (never overwritten) | All agents |

---

## PHASE 1 — FOUNDATION (Weeks 1–2)

### Step 1.1 — Create All Accounts

- supabase.com
- platform.openai.com
- console.anthropic.com
- replicate.com
- expo.dev
- cursor.sh
- github.com
- developer.apple.com (⚠️ $99/year — do this NOW, takes 48h approval)

Store all API keys in a local notes file only. Never paste online.

### Step 1.2 — Install Dev Tools

```bash
# Node.js 20 LTS, Git, Cursor (cursor.sh)
# Install Expo Go on your actual phone
npm install -g supabase
```

### Step 1.3 — Record Your Test Story

Record 3 minutes of yourself telling a real story about a real person from your life. In any mix of Hindi/English. Save as `test-story.m4a`. This is your test asset for the entire build. **Never use dummy audio.**

### Step 1.4 — Scaffold the Expo App

```bash
npx create-expo-app@latest Kahoma --template blank-typescript
cd Kahoma

npx expo install expo-router expo-av expo-file-system \
  expo-image-picker expo-sharing expo-media-library \
  @supabase/supabase-js zustand \
  react-native-url-polyfill \
  @react-native-async-storage/async-storage \
  @expo/vector-icons

npm install

git init && git add . && git commit -m "initial scaffold"
```

---

## PROMPT B-01 — FULL PROJECT STRUCTURE

**Tool: Cursor | Paste CONTEXT.md first**

```
I just created an Expo app called Kahoma (SDK 51, Expo Router v3, TypeScript).
Backend: Supabase only. Auth: Phone OTP.

Set up the complete project:

1. Update app.json:
   - scheme: "kahoma"
   - iOS bundleIdentifier: "com.yourname.kahoma"
   - Android package: "com.yourname.kahoma"
   - plugins: expo-router, expo-av, expo-file-system, expo-image-picker
   - iOS NSMicrophoneUsageDescription: "Kahoma records your stories"
   - iOS NSPhotoLibraryUsageDescription: "Add character photos to your story"

2. tsconfig.json: strict mode, path alias "@/*" → "./src/*"

3. Create this exact folder structure (empty placeholder files):
src/
  app/
    (tabs)/
      _layout.tsx
      index.tsx
      record.tsx
      profile.tsx
    auth/
      phone.tsx
      verify.tsx
    session/
      [id].tsx
    book/
      [id].tsx
    _layout.tsx
    onboarding.tsx
  components/
    AudioWaveform.tsx
    RecordButton.tsx
    ClarificationBubble.tsx
    UserBubble.tsx
    AgentStatusBar.tsx
    BookCover.tsx
    SessionCard.tsx
  hooks/
    useRecording.ts
    useSessionStatus.ts
  lib/
    supabase.ts
    uploadService.ts
    bibleService.ts
    pdfService.ts
  store/
    auth.ts
    sessions.ts
  types/
    index.ts

4. src/lib/supabase.ts: Supabase client from env vars. AsyncStorage for sessions.

5. src/types/index.ts with these TypeScript interfaces:
   Session: { id, user_id, title, status, phase, created_at, updated_at }
   VoiceChunk: { id, session_id, user_id, audio_url, transcript, chunk_order, created_at }
   SentimentStore: { id, session_id, sentiment, tonality, story_direction, predicted_future, confidence, updated_at }
   EntityStore: { id, session_id, entities: Entity[], relationships: Relationship[], updated_at }
   Entity: { entity_id, type: 'character'|'event'|'place'|'era', name, user_perspective: string, attributes: Record<string,any> }
   Relationship: { from_entity_id, to_entity_id, relationship_type, description }
   Character: { id, session_id, name, relationship_to_narrator, birth_era, photo_url, photo_era_transformed_url, photo_requested: boolean }
   ContextMessage: { id, session_id, role: 'user'|'assistant', content, chunk_id, created_at }
   EvaluatorResult: { score, decision: 'acknowledge'|'ask', gaps: string[], questions_to_ask: string[] }
   Chapter: { id, session_id, chapter_number, title, era, location, transcript_segments: string[], content_written, image_url, image_prompt, emotional_arc, status }
   Book: { id, session_id, user_id, pdf_url, cover_title, author_name, status, page_count, created_at }
   SessionStatus: 'recording'|'processing_chunk'|'awaiting_user'|'generating_book'|'book_ready'|'failed'

6. Create .env.local with EXPO_PUBLIC_ vars

Create all files. Show final tree.
```

---

## PROMPT B-02 — SUPABASE SQL MIGRATION

**Tool: Claude.ai → paste into Supabase SQL Editor**

```sql
-- Run this complete migration in Supabase SQL Editor

-- 1. SESSIONS
CREATE TABLE sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users NOT NULL ON DELETE CASCADE,
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
  session_id uuid REFERENCES sessions UNIQUE ON DELETE CASCADE,
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
  session_id uuid REFERENCES sessions UNIQUE ON DELETE CASCADE,
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
  session_id uuid REFERENCES sessions UNIQUE ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users,
  pdf_url text,
  cover_title text,
  author_name text,
  status text DEFAULT 'pending',
  page_count integer,
  created_at timestamptz DEFAULT now()
);

-- INDEXES
CREATE INDEX ON sessions(user_id);
CREATE INDEX ON voice_chunks(session_id);
CREATE INDEX ON context_messages(session_id);
CREATE INDEX ON chapters(session_id);

-- UPDATED_AT TRIGGER
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$ LANGUAGE plpgsql;
CREATE TRIGGER sessions_updated_at BEFORE UPDATE ON sessions FOR EACH ROW EXECUTE FUNCTION update_updated_at();

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
CREATE POLICY "users_own_sessions" ON sessions FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "users_own_chunks" ON voice_chunks FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "users_own_sentiment" ON sentiment_store FOR ALL USING (
  session_id IN (SELECT id FROM sessions WHERE user_id = auth.uid()));
CREATE POLICY "users_own_entities" ON entity_store FOR ALL USING (
  session_id IN (SELECT id FROM sessions WHERE user_id = auth.uid()));
CREATE POLICY "users_own_messages" ON context_messages FOR ALL USING (
  session_id IN (SELECT id FROM sessions WHERE user_id = auth.uid()));
CREATE POLICY "users_own_characters" ON characters FOR ALL USING (
  session_id IN (SELECT id FROM sessions WHERE user_id = auth.uid()));
CREATE POLICY "users_own_chapters" ON chapters FOR ALL USING (
  session_id IN (SELECT id FROM sessions WHERE user_id = auth.uid()));
CREATE POLICY "users_own_books" ON books FOR ALL USING (auth.uid() = user_id);

-- REALTIME: Enable on key tables
ALTER PUBLICATION supabase_realtime ADD TABLE sessions;
ALTER PUBLICATION supabase_realtime ADD TABLE context_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE chapters;
ALTER PUBLICATION supabase_realtime ADD TABLE books;

-- STORAGE BUCKETS (create in Supabase Dashboard → Storage)
-- "audio"   private, 200MB max per file
-- "photos"  private, 20MB max per file
-- "books"   private, 50MB max per file
```

---

## PROMPT B-03 — PHONE OTP AUTH

**Tool: Cursor | Paste CONTEXT.md first**

```
Build complete phone OTP auth for Kahoma.

1. src/store/auth.ts — Zustand store:
   State: { user, session, loading, initialized }
   Actions:
   - initialize(): supabase.auth.onAuthStateChange, set state, initialized=true
   - sendOTP(phone: string): supabase.auth.signInWithOtp({ phone })
     Validate phone has country code before calling
   - verifyOTP(phone: string, token: string): supabase.auth.verifyOtp({ phone, token, type: 'sms' })
   - signOut(): supabase.auth.signOut()

2. src/app/_layout.tsx — Root layout:
   - Initialize auth on mount
   - Loading: centered spinner while !initialized
   - Redirect if no user → /auth/phone
   - Redirect if user → /(tabs) (or /onboarding if first time via AsyncStorage "kahoma_onboarded")

3. src/app/auth/phone.tsx:
   Deep dark background (#050508)
   Center: large "Kahoma" in Cormorant Garamond serif, amber color
   Tagline: "Your story. Your words. Your book." in muted small text
   Below: country code picker (default +91) + phone number input
   "Get OTP" button in amber
   Warm minimal aesthetic — feels like an exclusive journal app

4. src/app/auth/verify.tsx:
   "Enter the 6-digit code sent to {phone}"
   Six individual TextInput boxes, auto-advance on each digit
   Auto-submit when all 6 entered
   "Resend code" with 60-second cooldown timer
   Back button to /auth/phone
   Same dark amber aesthetic

TypeScript. Handle all error states. No external UI libraries.
```

**✅ GATE — Test on real phone before moving on:**
- Enter phone → OTP arrives → Enter code → Home screen shows → Kill app → Reopen → Still logged in → Sign out → Back to phone screen. All 5 pass? Git commit. Move to Phase 2.

---

## PHASE 2 — AGENT FUNCTIONS (Weeks 3–7)

### Step 2.1 — Initialize Supabase Functions

```bash
supabase login
supabase init
supabase link --project-ref YOUR_PROJECT_REF

# Phase 1 Agent Functions
supabase functions new transcribe-chunk
supabase functions new run-s-agent
supabase functions new run-e-agent
supabase functions new run-evaluator
supabase functions new run-clarification
supabase functions new process-chunk

# Phase 2 Agent Functions
supabase functions new run-breaker
supabase functions new run-proxy-writer
supabase functions new run-picasso
supabase functions new run-binder
supabase functions new generate-book

# Set all API keys as secrets (never in code)
supabase secrets set OPENAI_API_KEY=sk-...
supabase secrets set ANTHROPIC_API_KEY=sk-ant-...
supabase secrets set REPLICATE_API_KEY=r8_...
supabase secrets set PDFSHIFT_API_KEY=your_key
```

---

## PROMPT B-04 — TRANSCRIBE-CHUNK EDGE FUNCTION

**Tool: Cursor | Paste CONTEXT.md first**

Create `supabase/functions/transcribe-chunk/index.ts`:

```typescript
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

serve(async (req) => {
  const { chunk_id } = await req.json()
  
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  // 1. Fetch voice_chunk
  const { data: chunk, error } = await supabase
    .from('voice_chunks')
    .select('*, sessions!inner(id, user_id)')
    .eq('id', chunk_id)
    .single()
  
  if (error || !chunk || chunk.whisper_status !== 'pending') {
    return new Response(JSON.stringify({ success: false, reason: 'chunk not found or not pending' }))
  }

  // 2. Mark as transcribing
  await supabase.from('voice_chunks').update({ whisper_status: 'transcribing' }).eq('id', chunk_id)

  try {
    // 3. Get signed URL for audio
    const { data: signedUrlData } = await supabase.storage
      .from('audio')
      .createSignedUrl(chunk.audio_url, 3600)
    
    // 4. Download audio
    const audioResponse = await fetch(signedUrlData!.signedUrl)
    const audioBuffer = await audioResponse.arrayBuffer()
    
    // 5. Call Whisper
    const formData = new FormData()
    formData.append('file', new Blob([audioBuffer], { type: 'audio/m4a' }), 'audio.m4a')
    formData.append('model', 'whisper-1')
    formData.append('response_format', 'text')
    // NOTE: No language param — auto-detect handles Hindi-English mix
    
    const whisperResponse = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${Deno.env.get('OPENAI_API_KEY')}` },
      body: formData
    })
    const transcript = await whisperResponse.text()

    // 6. Update chunk + append to context_messages
    await supabase.from('voice_chunks').update({ transcript, whisper_status: 'done' }).eq('id', chunk_id)
    
    const { data: msgCount } = await supabase
      .from('context_messages')
      .select('id', { count: 'exact' })
      .eq('session_id', chunk.session_id)
    
    await supabase.from('context_messages').insert({
      session_id: chunk.session_id,
      role: 'user',
      content: transcript,
      chunk_id: chunk_id,
      message_order: (msgCount?.length ?? 0) + 1
    })

    // 7. Fire process-chunk (fire and forget)
    fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/process-chunk`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ session_id: chunk.session_id, chunk_id })
    }) // Do NOT await

    return new Response(JSON.stringify({ success: true, transcript }))
  } catch (err) {
    await supabase.from('voice_chunks').update({ whisper_status: 'failed' }).eq('id', chunk_id)
    console.error('Transcription failed:', err)
    return new Response(JSON.stringify({ success: false, error: String(err) }), { status: 500 })
  }
})
```

---

## PROMPT B-05 — S-AGENT EDGE FUNCTION

**Tool: Cursor | Paste CONTEXT.md first**

Create `supabase/functions/run-s-agent/index.ts`:

**Agent System Prompt (embed verbatim in the function):**

```
You are the Sentiment Analysis Agent for Kahoma, a storytelling platform.
You analyze a growing conversation transcript and extract the emotional landscape.

You MUST respond with ONLY a valid JSON object — no other text, no markdown, no explanation.

JSON schema:
{
  "sentiment": string (overall emotional tone: joyful|melancholic|nostalgic|bitter|triumphant|haunted|complex|etc),
  "tonality": string (how narrator tells the story: crying|proud|detached|warm|angry|peaceful|etc),
  "story_direction": string (where narrator is steering this — their intent, what they want to convey),
  "political_social_lens": string or null (any bias, worldview, or perspective the narrator brings),
  "predicted_future": string (your prediction of where this story will emotionally go),
  "confidence": integer (0-100, how confident you are in this analysis given available context),
  "key_emotional_moments": string[] (specific moments from the transcript with high emotional weight),
  "narrator_current_emotional_state": string (how narrator feels RIGHT NOW while telling this)
}

RULE: The user is the supreme authority on their own story. Never judge. Always understand.
If information is insufficient: make your best inference and set confidence accordingly.
```

**Function logic:**
1. Fetch all `context_messages` for `session_id`, ordered by `message_order`
2. Build full context string
3. Call Claude API (`claude-sonnet-4-5`) with above system prompt
4. Parse JSON response (strip markdown fences if present, trim whitespace)
5. UPSERT to `sentiment_store` — if row exists: UPDATE. If not: INSERT.
6. Return `{ success: true, output: parsedJSON }`

---

## PROMPT B-06 — E-AGENT EDGE FUNCTION

**Tool: Cursor | Paste CONTEXT.md first**

Create `supabase/functions/run-e-agent/index.ts`:

**Agent System Prompt (embed verbatim):**

```
You are the Entity Extraction Agent for Kahoma.
Your job: extract ALL meaningful entities from this story and capture
THE NARRATOR'S PERSPECTIVE on each entity — not the objective reality.

CRITICAL: A grandmother can be loving OR cruel depending on the narrator's experience.
A house can feel like home OR like a prison. A success can feel like a failure.
ALWAYS capture what the entity MEANS to THIS narrator, not what it objectively is.

Respond with ONLY a valid JSON object:
{
  "entities": [
    {
      "entity_id": string (short unique slug: e.g., "dadi-1", "house-lahore"),
      "type": "character"|"event"|"place"|"era"|"object",
      "name": string,
      "user_perspective": string (HOW THE NARRATOR VIEWS THIS — THE MOST IMPORTANT FIELD),
      "emotional_charge": "positive"|"negative"|"complex"|"neutral",
      "attributes": {
        // for character: { "relationship_to_narrator": string, "birth_era_approx": string, "key_traits_per_narrator": string }
        // for event: { "when": string, "outcome": string, "narrator_felt": string }
        // for place: { "location": string, "era": string, "what_it_represents_to_narrator": string }
        // for era: { "decade": string, "geographic_context": string }
      },
      "mentioned_in_chunks": integer[]
    }
  ],
  "relationships": [
    {
      "from": string (entity_id),
      "to": string (entity_id),
      "type": string (is_parent_of|is_child_of|married_to|enemy_of|lived_in|caused|etc),
      "narrator_framing": string (how narrator describes this relationship)
    }
  ],
  "new_characters_this_chunk": string[] (entity_ids of characters appearing for FIRST TIME)
}

RULE: Merge with existing entities — enrich them, don't duplicate.
RULE: Always prioritize narrator's subjective experience over objective interpretation.
```

**Function logic:**
1. Fetch all `context_messages` for session
2. Fetch CURRENT `entity_store` (for enrichment, not replacement)
3. Call Claude API with system prompt above + existing entities as context
4. Parse JSON
5. UPSERT `entity_store` (enrich existing data)
6. For each entity in `new_characters_this_chunk`: check if `photo_requested=true`. If not: insert character row, set `photo_requested=false`
7. Return `{ success: true, output, new_characters: [...] }`

---

## PROMPT B-07 — EVALUATOR EDGE FUNCTION

**Tool: Cursor | Paste CONTEXT.md first**

Create `supabase/functions/run-evaluator/index.ts`:

**Agent System Prompt (embed verbatim):**

```
You are the Evaluator Agent for Kahoma. You assess how well the S-Agent and E-Agent
have understood the story so far, and decide whether we need clarification.

You receive: the full story context + S-Agent output + E-Agent output.

Score the understanding from 0 to 100 based on:
- Entity completeness: are all mentioned people/places/events captured? (25pts)
- Relationship clarity: are key relationships between entities clear? (20pts)
- Sentiment confidence: is emotional understanding solid? (20pts)
- Perspective accuracy: is user's subjective view of entities captured? (20pts)
- Story coherence: can we tell a coherent story from what we have? (15pts)

THRESHOLD LOGIC:
- Score ≥ 80: Understanding is good. Acknowledge user. Let them continue.
- Score < 80: Understanding has gaps. Ask ONE specific clarifying question about the most critical gap.

CATASTROPHIC ASSUMPTION RULE: If you are unsure about a key character's identity
in a way that would fundamentally change the story's meaning → ALWAYS ask,
regardless of score. Mark as catastrophic_gap: true.

Respond with ONLY valid JSON:
{
  "overall_score": integer,
  "dimension_scores": { 
    "entity_completeness": int, 
    "relationship_clarity": int, 
    "sentiment_confidence": int, 
    "perspective_accuracy": int, 
    "story_coherence": int 
  },
  "decision": "acknowledge" | "ask",
  "gaps": string[],
  "most_critical_gap": string or null,
  "question_to_ask": string or null (if decision is "ask" — warm, specific, max 1 sentence),
  "catastrophic_gap": boolean,
  "new_characters_needing_photo": string[]
}
```

**Function logic:**
1. Fetch `context_messages`, `sentiment_store`, `entity_store` for session
2. Build evaluation input combining all three
3. Call Claude API with system prompt above
4. Parse JSON
5. Return `{ success: true, result: parsedJSON }`

---

## PROMPT B-08 — CLARIFICATION AGENT EDGE FUNCTION

**Tool: Cursor | Paste CONTEXT.md first**

Create `supabase/functions/run-clarification/index.ts`:

**Agent System Prompt (embed verbatim):**

```
You are Kahoma's story companion. You speak like a warm, patient friend who is
helping someone turn their life story into a book.

Your tone: gentle, unhurried, genuinely interested. Never clinical. Never formal.
Length: acknowledgements = max 2 sentences. Questions = max 1 sentence. Photo request = max 2 sentences.

If acknowledging: express genuine appreciation for what was shared. Invite continuation.
If asking: phrase the question as a gentle clarification, not an interrogation.
If requesting photo: explain warmly how it will help bring the story to life. Make clear it's optional.

Examples of good acknowledgement tone:
"That's a remarkable memory — the way you describe the monsoon season really brings it to life. Please continue."
"I can feel the weight of that moment. Take your time and tell me more whenever you're ready."

Examples of good question tone:
"I want to make sure I have Rahul right — he's your father, yes?"
"Just to hold the story clearly — which city did this happen in?"
```

**Function logic:**
1. Receive `session_id` and `evaluator_result` in POST body
2. Fetch session + latest context for story tone
3. Build message via Claude:
   - If `decision = 'acknowledge'` AND no photo requests: generate warm 1-2 sentence acknowledgement
   - If `decision = 'ask'`: rephrase `question_to_ask` into warm, friendly language
   - If `new_characters_needing_photo` exist: append photo request for FIRST unasked character only, mark `character.photo_requested = true`
4. Insert message into `context_messages`: `{ session_id, role: 'assistant', content: generatedMessage, message_order: next }`
5. Update `session.status = 'awaiting_user'`
6. Return `{ success: true, message: generatedMessage, decision }`

---

## PROMPT B-09 — PROCESS-CHUNK ORCHESTRATOR

**Tool: Cursor | Paste CONTEXT.md first**

Create `supabase/functions/process-chunk/index.ts` — the Phase 1 orchestrator:

```typescript
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

serve(async (req) => {
  const { session_id, chunk_id } = await req.json()

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  const BASE = Deno.env.get('SUPABASE_URL') + '/functions/v1'
  const H = {
    'Authorization': 'Bearer ' + Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'),
    'Content-Type': 'application/json'
  }

  async function callAgent(name: string, body: object) {
    const r = await fetch(`${BASE}/${name}`, { method: 'POST', headers: H, body: JSON.stringify(body) })
    const d = await r.json()
    if (!d.success) throw new Error(`${name} failed: ${JSON.stringify(d)}`)
    return d
  }

  // Log to processing_log table
  async function log(event: string, data: object) {
    await supabase.from('processing_log').insert({ session_id, chunk_id, event, data })
  }

  await supabase.from('sessions').update({ status: 'processing_chunk' }).eq('id', session_id)

  try {
    // Step 1: Run S-Agent and E-Agent in PARALLEL
    const [sResult, eResult] = await Promise.all([
      callAgent('run-s-agent', { session_id }),
      callAgent('run-e-agent', { session_id })
    ])
    await log('agents_complete', { s: sResult.output, e: eResult.output })

    // Step 2: Run Evaluator
    const evalResult = await callAgent('run-evaluator', { session_id })
    await log('evaluator_complete', { score: evalResult.result.overall_score, decision: evalResult.result.decision })

    // Step 3: Run Clarification Agent
    await callAgent('run-clarification', { session_id, evaluator_result: evalResult.result })

    await supabase.from('sessions').update({ status: 'awaiting_user' }).eq('id', session_id)
    console.log(`Chunk processed for session: ${session_id} | Score: ${evalResult.result.overall_score}`)

    return new Response(JSON.stringify({ success: true }))
  } catch (err) {
    // CRITICAL: Even if agents fail, always try to send an acknowledgement
    console.error('Pipeline error:', err)
    await log('pipeline_error', { error: String(err) })
    
    try {
      await callAgent('run-clarification', {
        session_id,
        evaluator_result: { decision: 'acknowledge', overall_score: 80, gaps: [], new_characters_needing_photo: [] }
      })
    } catch (fallbackErr) {
      console.error('Fallback clarification also failed:', fallbackErr)
    }

    await supabase.from('sessions').update({ status: 'awaiting_user' }).eq('id', session_id)
    return new Response(JSON.stringify({ success: false, error: String(err) }))
  }
})
```

Also create the `processing_log` table:
```sql
CREATE TABLE processing_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid,
  chunk_id uuid,
  event text,
  data jsonb,
  created_at timestamptz DEFAULT now()
);
```

**✅ GATE — Run this before building UI:**
Create `test-phase1.mjs`. Upload `test-story.m4a`, create a session, call `transcribe-chunk`, watch `process-chunk` run all 4 agents. Verify:
1. Whisper transcript is accurate
2. S-Agent produces meaningful sentiment JSON
3. E-Agent correctly identifies characters with user perspective
4. Evaluator gives a reasonable score
5. Clarification Agent produces a warm human-sounding message

All 5 pass? Then build Phase 2 agents.

---

## PHASE 3 — PHASE 2 AGENTS: THE BOOK (Weeks 8–11)

## PROMPT B-10 — BIBLE SERVICE + GENERATE-BOOK ORCHESTRATOR

**Tool: Cursor | Paste CONTEXT.md first**

```
Create src/lib/bibleService.ts AND supabase/functions/generate-book/index.ts

1. bibleService.ts (client-side helper):
   assembleBible(sessionId: string): Promise<Bible>
   - Fetch: sentiment_store, entity_store, all context_messages for session
   - Return: { sentimentStore, entityStore, contextWindow: messages[], sessionId }

2. supabase/functions/generate-book/index.ts (Phase 2 orchestrator):
   Handles: POST { session_id: string }
   
   - Update session.phase = 2, session.status = 'generating_book'
   - Fetch the Bible (S store + E store + context messages)
   
   Sequence (await each step):
   Step 1: callAgent('run-breaker', { session_id, bible }) → chapter structure
   Step 2: For each chapter: await callAgent('run-proxy-writer', { session_id, chapter_id, bible })
           (Process sequentially for coherence)
   Step 3: callAgent('run-picasso', { session_id, bible }) → all images
   Step 4: callAgent('run-binder', { session_id }) → final PDF
   
   On completion: session.status = 'book_ready'
   On failure: session.status = 'failed', session.error_message = error
   
   Also expose: GET ?session_id=xxx → returns current status + progress
```

---

## PROMPT B-11 — BREAKER AGENT EDGE FUNCTION

**Tool: Cursor | Paste CONTEXT.md first**

Create `supabase/functions/run-breaker/index.ts`:

**Agent System Prompt (embed verbatim):**

```
You are the Breaker Agent. You are a master literary architect who thinks like
India's greatest storytellers: Munshi Premchand, Dharmveer Bharati,
Suryakant Tripathi Nirala, Amrita Pritam. You understand that the ORDER of
a story's revelation is as important as the story itself.

You receive: a complete "Bible" containing:
- The narrator's full transcript (raw, spoken, unstructured)
- Sentiment analysis (emotional arc, tonality, direction)
- Entity map (all characters, places, events, eras and narrator's perspective on each)

Your task: divide the story into optimal chapters.
NOT chronological necessarily — find the order that creates the most
emotionally resonant, structurally beautiful book.

Consider: what should the reader discover first? Where should the emotional peak be?
What should be the final chapter that leaves the reader changed?

Respond with ONLY valid JSON:
{
  "book_title": string (evocative, literary — 4-6 words),
  "book_subtitle": string or null,
  "narrative_structure": string (describe your structural choice and why),
  "chapters": [
    {
      "chapter_number": integer,
      "title": string (literary, evocative — not descriptive),
      "era": string,
      "primary_location": string,
      "primary_character": string (entity_id from entity store),
      "emotional_arc": string (what emotional journey this chapter takes reader on),
      "relevant_transcript_sections": string[] (exact quotes from transcript that belong here),
      "image_concept": string (describe the scene for chapter image — specific about lighting, mood, era)
    }
  ],
  "total_chapters": integer
}

RULE: Each chapter title should be so good a reader would stop at a bookshop to read it.
```

**Function logic:**
1. Call Claude with Bible serialized as context
2. Parse JSON response
3. Insert each chapter into `chapters` table
4. Insert into `books` table: `{ session_id, user_id, cover_title: book_title, status: 'generating' }`
5. Return `{ success: true, chapters: parsedChapters, book_id }`

---

## PROMPT B-12 — PROXY WRITER EDGE FUNCTION

**Tool: Cursor | Paste CONTEXT.md first**

Create `supabase/functions/run-proxy-writer/index.ts`:

**Agent System Prompt (embed verbatim):**

```
You are the Proxy Writer — a literary author with 40 years of experience
writing prize-winning novels and memoirs across multiple languages and cultures.
You have a deep understanding of the human condition, Indian history and culture,
and the art of capturing lived experience in prose.

Your task: take raw, spoken transcript fragments and transform them into
a beautifully written chapter for a personal memoir.

CRITICAL RULES:
1. PRESERVE THE NARRATOR'S PERSPECTIVE ABSOLUTELY.
   If they say their grandmother was cruel — she is cruel in your prose.
   If they experienced success as painful — portray it as painful.
   You are their voice, not the judge of their experience.
2. Write in first person (narrator's voice) unless they told the story in third person.
3. Use vivid, specific sensory details. Reconstruct what the air smelled like.
4. Show, don't tell. Let the reader feel the emotion from action and detail.
5. Honor the culture, language, and setting. Use appropriate Hindi terms naturally.
6. Length: 400-700 words. Flowing prose. Natural paragraph breaks. No bullet points.
7. Opening: begin with a specific sensory moment or image that draws the reader in.
8. Closing: end on a resonant note — a thought, an image, or a quiet revelation.
9. You may reconstruct dialogue if implied in the transcript. Keep it authentic.
10. DO NOT sanitize. DO NOT add false hope. DO NOT change what the narrator felt.
```

**User message format:**
```
Chapter: {title}
Era: {era}, {location}
Character: {character name} — {narrator's perspective on them}

Raw story fragments:
{transcript_sections joined with newlines}
```

**Function logic:**
1. Fetch chapter from DB by `chapter_id`
2. Build chapter context (transcript sections, character details, era, overall sentiment)
3. Call Claude API with system prompt above
4. Save response to `chapter.content_written`
5. Update `chapter.status = 'written'`
6. Return `{ success: true, chapter_id, word_count }`

---

## PROMPT B-13 — PICASSO AGENT EDGE FUNCTION

**Tool: Cursor | Paste CONTEXT.md first**

Create `supabase/functions/run-picasso/index.ts`:

**Two workflows — implement both:**

**WORKFLOW A — Era-transform user photos (character has photo_url):**
1. Get signed URL for character's photo from `photos` bucket
2. Determine era from chapter where character is most prominent
3. Build img2img prompt:
   ```
   Transform this portrait to appear as a photograph taken in {era} in {location}.
   {Era} photographic style: {specific visual details for era}.
   Preserve the subject's facial identity and core features exactly.
   Film grain, period-appropriate lighting, authentic {era} aesthetic.
   ```
   negative_prompt: `"modern, contemporary, digital photography, 2020s, 2010s"`
4. Call Replicate `stability-ai/sdxl` img2img: `{ image: signedPhotoUrl, prompt, strength: 0.55, num_inference_steps: 30 }`
5. Poll Replicate every 5 seconds, 5 minute timeout
6. Upload result to `photos/{session_id}/char_{char_id}_era.jpg`
7. Update `character.photo_era_transformed_url`

**WORKFLOW B — Generate chapter illustrations (no photo available):**
1. Get `chapter.image_concept`, `era`, `location`, `emotional_arc`
2. Build generation prompt:
   ```
   {image_concept}. {Era} photographic style. Set in {location}.
   Emotional quality: {emotional_arc}.
   Photorealistic, film photography aesthetic, warm tones, {era} visual grammar.
   Compositionally strong, would work as a book chapter opener.
   ```
   negative_prompt: `"illustration, digital art, modern, contemporary, 2020s, cartoon, anime"`
3. Call Replicate text-to-image: `{ num_inference_steps: 30, guidance_scale: 7.5, width: 1024, height: 768 }`
4. Poll, download, upload to `photos/{session_id}/chapter_{chap_id}.jpg`
5. Update `chapter.image_url` and `chapter.image_prompt`

**Important:** Process all images. Log failures but don't abort — chapters can have no image if generation fails.
Return `{ success: true, images_generated: count, images_failed: count }`

---

## PROMPT B-14 — BINDER AGENT EDGE FUNCTION (PDF GENERATION)

**Tool: Cursor | Paste CONTEXT.md first**

Create `supabase/functions/run-binder/index.ts`:

**This creates the final PDF book. This is the moment that surprises the user.**

**Function logic:**
1. Fetch: book record, all chapters (ordered), session (for author name/title)
2. Get signed URLs for all chapter `image_url`s
3. Build complete book HTML using this CSS/structure template:

```css
@page { size: 148mm 210mm; margin: 22mm 18mm 20mm 22mm; }
body { font-family: 'Cormorant Garamond', serif; font-size: 11.5pt; line-height: 1.75; color: #1a1410; }
.cover { page-break-after: always; display: flex; flex-direction: column; justify-content: center; min-height: 85vh; border: 1px solid #8a7a6a; padding: 40px; }
.cover-title { font-size: 28pt; font-weight: 700; line-height: 1.1; margin-bottom: 16px; }
.cover-author { font-size: 13pt; font-style: italic; color: #6b5c4e; }
.toc { page-break-after: always; }
.chapter { page-break-before: always; }
.chapter-number { font-size: 9pt; letter-spacing: 0.3em; text-transform: uppercase; color: #8a7a6a; margin-bottom: 8px; }
.chapter-title { font-size: 20pt; font-weight: 700; line-height: 1.1; margin-bottom: 8px; }
.chapter-meta { font-size: 9pt; font-style: italic; color: #8a7a6a; margin-bottom: 32px; border-bottom: 1px solid #d4c4b4; padding-bottom: 12px; }
.chapter-image { width: 100%; height: auto; max-height: 200px; object-fit: cover; margin: 0 0 24px 0; display: block; }
.chapter-body p:first-child::first-letter { font-size: 3em; font-weight: 700; float: left; line-height: 0.7; padding-right: 8px; padding-top: 4px; }
.chapter-body p { text-align: justify; margin-bottom: 1em; }
```

**HTML Structure:**
- COVER PAGE: book title + decorative SVG ornament + "By {author_name}" + year
- TOC: list of chapter titles with roman numerals
- EACH CHAPTER: roman numeral + literary title + era/location in italic + full-width image (if exists) + prose with drop cap

4. Call PDFShift API:
   ```
   POST https://api.pdfshift.io/v3/convert/pdf
   Authorization: Basic base64("{PDFSHIFT_API_KEY}:")
   Body: { source: htmlString, sandbox: false, format: "A5",
           margin: { top: "22mm", bottom: "20mm", left: "22mm", right: "18mm" } }
   ```
5. Receive PDF as ArrayBuffer
6. Upload to `books/{session_id}/kahoma_book.pdf`
7. Update `books`: `{ pdf_url, status: 'ready', page_count: estimated }`
8. Update `session.status = 'book_ready'`
9. Return `{ success: true, pdf_url }`

**✅ GATE — End to End Test:**
Real 3-minute story → all Phase 1 agents → "Generate My Book" → Breaker structures chapters → Proxy Writer produces literary prose → Picasso transforms photos → Binder produces PDF. Open the PDF. It must look like a real book. If it does — you have a product.

---

## PHASE 4 — THE MOBILE APP (Weeks 12–13)

## PROMPT B-15 — RECORDING HOOK + UPLOAD SERVICE

**Tool: Cursor | Paste CONTEXT.md first**

```
Create two files:

1. src/hooks/useRecording.ts:
State: recordingState: 'idle'|'recording'|'paused', currentRecording, durationMillis, audioLevels: number[]

Functions:
- startRecording():
  await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true })
  Create recording with HIGH_QUALITY preset + isMeteringEnabled: true
  onRecordingStatusUpdate: update durationMillis and audioLevels (20 values, normalized 0-1)
  Auto-stop at 10 minutes (600000ms)
- pauseRecording(): recording.pauseAsync()
- resumeRecording(): recording.startAsync()
- stopAndGetUri(): recording.stopAndUnloadAsync(), return recording.getURI()
- discardRecording(): stop + delete local file + reset state

Return: { recordingState, durationMillis, audioLevels, startRecording, pauseRecording,
          resumeRecording, stopAndGetUri, discardRecording, permissionDenied }

2. src/lib/uploadService.ts:

createSession(userId: string, title: string): Promise<Session>
  Insert into sessions table, return row

uploadChunk(localUri: string, sessionId: string, chunkOrder: number): Promise<VoiceChunk>
  - Upload to Storage: audio/{userId}/{sessionId}/chunk_{chunkOrder}_{timestamp}.m4a
  - Insert into voice_chunks: { session_id, user_id, audio_url: path, chunk_order }
  - Fire-and-forget: supabase.functions.invoke('transcribe-chunk', { body: { chunk_id } })
  - Return the inserted chunk

uploadCharacterPhoto(localUri: string, sessionId: string, characterId: string): Promise<string>
  - Upload to Storage: photos/{userId}/{sessionId}/char_{characterId}.jpg
  - Update character.photo_url = storagePath
  - Return storagePath

Full TypeScript. Error handling for file too large (200MB limit for audio, 20MB for photos).
```

---

## PROMPT B-16 — ACTIVE SESSION SCREEN (THE CORE LOOP)

**Tool: Cursor | Paste CONTEXT.md first**

```
Build src/app/session/[id].tsx — The active storytelling session screen.
This is where the user lives for their entire story.

THREE MODES based on session.status:

=== RECORDING MODE (status = 'recording' or 'awaiting_user') ===
Dark background (#050508).
Top: session title, small "Session" label.

CHAT AREA (ScrollView, main body):
  Shows conversation history from context_messages:
  - User transcript chunks: right-aligned dark cards with user's words
  - AI clarification messages: left-aligned, warm amber-tinted cards
    with a small Kahoma "K" avatar
  Photo request messages: show a camera icon button inline
  Auto-scroll to latest message.

BOTTOM AREA:
  If status = 'awaiting_user':
    - "Record more" mic button (amber, pulsing slightly)
    - "That's my story →" gold button → triggers generate-book + navigate to /book/[id]
    
  If recording actively:
    - AudioWaveform component (animated bars)
    - "Recording... 0:42" timer
    - "Done" button to stop and upload chunk
    - "Pause" small button
    
  Photo upload prompt: show inline image picker → call uploadCharacterPhoto()

=== PROCESSING MODE (status = 'processing_chunk') ===
  Show AgentStatusBar component: animated dots showing agents running
  "Listening to your story..." text
  Chat area visible underneath

=== BOOK GENERATION MODE (status = 'generating_book') ===
  Navigate to /book/[id] screen automatically

LOGIC:
- useSessionStatus hook for real-time Supabase updates
- When new context_message appears (Realtime): scroll chat to bottom
- Record chunk → uploadChunk() → transcribe-chunk triggers → process-chunk runs → clarification appears in chat

TypeScript. Dark amber aesthetic. The chat feel must be intimate and warm.
```

---

## PROMPT B-17 — HOME + LIBRARY + BOOK SCREENS

**Tool: Cursor | Paste CONTEXT.md first**

```
Build four screens:

1. src/app/(tabs)/index.tsx — Home Screen:
   Dark background.
   Top: "Kahoma" in Cormorant Garamond, amber. Greeting.
   
   Empty state:
     Large decorative feather quill SVG (amber outline)
     "Every life holds a story worth telling."
     "Begin yours." button → creates new session → navigates to /session/[id]
   
   Recent sessions list (last 3):
     SessionCard component: title, status indicator, date
     Tap → navigate to /session/[id] or /book/[id] if book_ready
   
   "+ New Story" floating button (amber, bottom right)

2. src/components/SessionCard.tsx:
   Dark card, title, date, status badge:
   - recording/awaiting_user: amber dot + "In Progress"
   - generating_book: animated spinner + "Creating your book..."
   - book_ready: teal dot + "Book Ready"
   - failed: red dot + "Error"
   Tap handler prop

3. src/app/book/[id].tsx — Book Screen:
   
   GENERATING STATE:
     Animated open-book SVG (pages turning gently)
     "We're writing your story... this takes about 5 minutes."
     Progress updates via Realtime chapter inserts
   
   READY STATE:
     BookCover component: deep dark card, amber title, "By [name]", year
     Slide-up reveal animation
     "Your book is ready." in Cormorant Garamond, large
     "Read My Book" primary button → opens PDF via Linking.openURL(signedUrl)
     "Download" secondary → expo-file-system + MediaLibrary
     "Share" outline button → expo-sharing

4. src/app/(tabs)/_layout.tsx:
   Tab bar: Home (book icon), Record (mic), Profile (person)
   Background: #050508, active: amber, inactive: muted
   No labels — icons only

Dark deep aesthetic. The app must feel like an intimate, sacred space for stories.
```

---

## PROMPT B-18 — ONBOARDING (EMOTIONAL, NON-GENERIC)

**Tool: Cursor | Paste CONTEXT.md first**

```
Build src/app/onboarding.tsx — 3-screen first-launch onboarding.
These are people with stories they've never told anyone.
Tone must be: sacred, warm, safe, non-clinical, slightly poetic.

Screen 1 — "Some stories wait a lifetime."
  Background: #050508
  Large: glowing amber ink-drop animation (SVG, radiating warmth)
  Heading: "Some stories wait a lifetime." — Cormorant Garamond, 32pt
  Body: "This is a place for the ones you've kept inside.
  The stories you couldn't tell. The lives you watched.
  The people you want remembered."
  "I have a story" → next

Screen 2 — "Just speak. We understand."
  Three points:
  🎙️ "Speak in any language, any order, any time"
  🤍 "We ask almost nothing — just listen deeply"
  📖 "We give you back a book you'll treasure forever"
  "How does it work?" → next

Screen 3 — "Your stories stay yours."
  "Everything you share is completely private.
  Only you can access your stories and your book.
  We never read, share, or use your stories for anything else."
  Microphone permission request (explain gently why needed)
  "Begin my story" → set AsyncStorage "kahoma_onboarded" = true → navigate to tabs

Implementation:
- Check AsyncStorage "kahoma_onboarded" in _layout.tsx — if not set, show onboarding
- Swipeable FlatList with pagingEnabled
- Dot indicators
- Deep dark background, amber glows, Cormorant Garamond headings
- The user must feel: safe, seen, ready.
```

**✅ FULL GATE — Test on real phone:**
Login → Onboarding → Record 3 minutes of real story → Watch AI respond in chat → Answer clarification question → Tap "That's my story" → Wait 5 minutes → Open PDF → See a real book with chapters, images, and beautifully written prose.

If this works: `git tag v0.1.0`

---

## PHASE 5 — TEST, POLISH, SHIP (Week 14)

## PROMPT B-19 — COMPLETE CODE AUDIT

**Tool: Cursor | Paste CONTEXT.md first**

```
Do a complete pre-submission audit of Kahoma.

1. MEMORY LEAKS:
   - expo-av Recording: stopped and unloaded on unmount?
   - Supabase Realtime channels: removed in cleanup?
   - All intervals/timeouts: cleared in cleanup?

2. EMOTIONAL SAFETY (critical — users share suppressed stories):
   - If user is mid-recording and navigates away: recording stops gracefully?
   - If transcription fails: clearly informed? Can they retry?
   - If book generation fails: is their ENTIRE story data preserved in DB?
   - Is there any scenario where story data is silently lost? Find and fix.
   - Privacy: are audio files NEVER logged or sent to any external logging?

3. AGENT FAILURE RESILIENCE:
   - If S-Agent fails: does E-Agent still run?
   - If Evaluator fails: does Clarification Agent still send acknowledgement?
   - If one Proxy Writer chapter fails: do other chapters still get written?
   - If Picasso fails on one image: does PDF still generate without it?

4. SECURITY:
   - All storage paths use signed URLs (never public)?
   - No API keys in any client-side code?
   - All DB operations use RLS — user A cannot access user B's story?

5. MISSING STATES:
   - Empty session (created but never recorded): handled?
   - Very short story (under 30 seconds): what happens?
   - Story with no identifiable characters: PDF still generates?

For each issue: file, problem, exact fix.
```

---

## PROMPT B-20 — EAS BUILD + APP STORE SUBMISSION

**Tool: Cursor | Paste CONTEXT.md first**

```
Configure EAS Build and App Store submission for Kahoma.

1. Create eas.json with preview and production profiles
2. Final app.json with all required permissions
3. Show exact commands:
   eas build --platform ios --profile preview   (for TestFlight)
   eas submit --platform ios
   eas build --platform android --profile preview

App Store metadata:
- Name: "Kahoma — Your Story, Your Book"
- Subtitle: "Voice to book in minutes"
- Description: Lead with suppressed stories, untold lives, people we want remembered.
  This is NOT a journaling app. It is a memoir creation platform.
  Emotional tone. Target: people in their 30s-70s with family stories to preserve.
- Keywords: memoir, voice journal, family history, life story, book maker, storytelling
- Age rating: 4+
```

---

## LAUNCH CHECKLIST

Every item must be ✅ before submitting to App Store:

- [ ] Full story-to-book flow tested on production Supabase (not local) with real voice recording
- [ ] Tested on real iPhone AND real Android phone
- [ ] Tested with 3+ minute story in Hindi-English mix
- [ ] All 4 Phase 1 agents logged and verified on real story
- [ ] Clarification question appeared at right time, answered, loop continued
- [ ] Photo upload → era transformation visible in final PDF
- [ ] PDF quality is genuinely book-like — chapters, images, drop caps, beautiful
- [ ] App in airplane mode: error shown, no crash, story data preserved in DB
- [ ] Session fails mid-generation: story data is NOT lost, retry works
- [ ] All API keys in Supabase secrets — zero in any source file
- [ ] RLS verified: user A cannot access user B's stories
- [ ] Privacy Policy live at a real URL
- [ ] Supabase on Pro plan (free tier pauses after inactivity)
- [ ] 5 real people have completed full flow and received their book
- [ ] Agent failure monitoring wired (Supabase webhook → email on session failure)

---

## DEBUG REFERENCE

### D-01 — Universal Bug Fix
```
[PASTE CONTEXT.md FIRST]

Bug. Do NOT rewrite files I haven't asked you to change.

Error: [EXACT ERROR + FULL STACK TRACE]
File: [filename]
Broken function (paste ONLY the broken function): [paste here]
Expected: [what should happen]
Actual: [what actually happens]

Root cause: diagnose WHY.
Fix: minimum code change only.
```

### D-02 — Claude JSON Parsing Failure
```
My Edge Function calls Claude API expecting JSON but parsing fails.

System prompt I'm using: [paste]
Raw response I'm receiving: [paste]
Parse error: [paste]

Fix: update system prompt AND add robust JSON extraction:
- Try JSON.parse first
- If fails: extract content between first { and last }
- If still fails: log raw response and return error with the raw text
```

### D-03 — Agent Producing Wrong Output
```
One of my Kahoma agents is producing bad output.

Agent: [S-Agent / E-Agent / Evaluator / Breaker / Proxy Writer / Picasso]
Problem: [describe what's wrong]
Current system prompt: [paste complete system prompt]
Context I'm feeding it: [paste the context]
Current output: [paste bad output]
Expected output: [describe what it should produce]

Diagnose: is this a system prompt design issue, context issue, or edge case?
Fix the system prompt. Show specifically what changed and why.
```

### D-04 — Replicate Image Generation Failing
```
Error from Supabase logs: [paste]
My Replicate API call code: [paste]
Model I'm using: [model identifier]

Check:
1. Is the input image URL accessible? (signed URLs expire)
2. Is the model identifier correct and still available?
3. Is my polling logic correct? (starting → processing → succeeded/failed)
4. Is the output format what I expect? (URL? array of URLs?)
```

### D-05 — Realtime Not Updating in Chat
```
[PASTE CONTEXT.md FIRST]

Supabase Realtime subscription not receiving context_messages in session screen.
DB row IS being inserted (confirmed in Supabase dashboard).
App is not receiving the event.

My subscription code: [paste from session/[id].tsx]

Check:
1. Does RLS SELECT policy allow this user to read context_messages?
2. Is the Realtime filter syntax correct for postgres_changes?
3. Is the channel being cleaned up causing re-subscription issues?
4. Is context_messages table enabled for Realtime?
   (ALTER PUBLICATION supabase_realtime ADD TABLE context_messages)
```

---

## COST MODEL

| Item | Cost |
|---|---|
| Supabase Free (development) | $0/mo |
| Supabase Pro (pre-launch upgrade) | $25/mo |
| OpenAI Whisper — ~$0.006/min × avg 8min/session | ~$0.05/book |
| Claude API — 6 agents × avg calls per session | ~$0.12/book |
| Replicate — ~5-8 images per book | ~$0.10/book |
| PDFShift API (free: 50/mo, then $9/mo) | $0–$9/mo |
| EAS Build (free: 30 builds/month) | $0/mo |
| Apple Developer Program | $99/year |
| Google Play Console | $25 once |
| **Total cost per book generated** | **~$0.27** |

**Pricing model:** ₹999 (~$12) per book. Cost per book: ~$0.27. Revenue per book: ~$12. **Gross margin: 97.7%.** The emotional value makes premium pricing natural — this is a memoir, not an app.

---

## IMPLEMENTATION ORDER SUMMARY

```
Week 1–2:   Accounts + Scaffold + SQL Migration + Phone OTP Auth
            → GATE: Login works on real phone

Week 3–5:   transcribe-chunk + process-chunk + S-Agent + E-Agent + Evaluator + Clarification
            → GATE: 5 test script verifications pass

Week 6–7:   Recording Hook + Upload Service + wire to transcribe-chunk
            → GATE: Real voice chunk triggers real AI response in logs

Week 8–9:   Bible Service + generate-book orchestrator + Breaker + Proxy Writer
            → GATE: Real story produces chapter structure + written prose

Week 10–11: Picasso + Binder + PDFShift integration
            → GATE: Real book PDF generated, looks publishable

Week 12–13: All UI screens (Session, Home, Book, Onboarding)
            → GATE: Full end-to-end on real phone, real story, real PDF

Week 14:    Code audit + EAS build + App Store submission
            → GATE: All 15 launch checklist items checked
```

---

*Kahoma — Complete Execution Plan | 6 AI Agents · 3 Memory Stores · 1 Surprise*

*Speak. Be remembered.*
