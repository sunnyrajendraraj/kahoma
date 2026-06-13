CONTEXT: I am building Kahoma — a voice-first memoir platform. 
Users speak their life stories. A 6-agent AI pipeline transcribes, 
analyzes, and generates a beautifully formatted PDF book.

YOUR TASK: Build the complete working foundation in this order. 
Stop after each phase and confirm before proceeding.

IRON LAWS — NEVER BREAK:
- TypeScript only. No 'any'. Handle all errors explicitly.
- Never rewrite files I haven't asked you to touch.
- No API keys in code — Supabase secrets only.
- After every change: list exactly what files changed and why.
- Architecture first, then code.

TECH STACK — NEVER SUGGEST ALTERNATIVES:
- Mobile: React Native + Expo SDK 51, Expo Router v3, TypeScript
- Auth: Supabase Phone OTP
- Backend: Supabase (Postgres + Storage + Edge Functions + Realtime)
- AI Agents: Claude API claude-sonnet-4-5 via Supabase Edge Functions (Deno)
- Transcription: OpenAI Whisper API (whisper-1)
- Image Gen: Replicate (stability-ai/sdxl)
- PDF: PDFShift API
- State: Zustand

--- PHASE 1: SCAFFOLD ---
1. Create Expo app: npx create-expo-app@latest Kahoma --template blank-typescript
2. Install all dependencies:
   npx expo install expo-router expo-av expo-file-system expo-image-picker 
   expo-sharing expo-media-library @supabase/supabase-js zustand 
   react-native-url-polyfill @react-native-async-storage/async-storage @expo/vector-icons
3. Create this exact folder structure with placeholder files:
   src/app/(tabs)/_layout.tsx, index.tsx, record.tsx, profile.tsx
   src/app/auth/phone.tsx, verify.tsx
   src/app/session/[id].tsx
   src/app/book/[id].tsx
   src/app/_layout.tsx, onboarding.tsx
   src/components/AudioWaveform.tsx, RecordButton.tsx, ClarificationBubble.tsx,
   UserBubble.tsx, AgentStatusBar.tsx, BookCover.tsx, SessionCard.tsx
   src/hooks/useRecording.ts, useSessionStatus.ts
   src/lib/supabase.ts, uploadService.ts, bibleService.ts, pdfService.ts
   src/store/auth.ts, sessions.ts
   src/types/index.ts
4. Create src/types/index.ts with these interfaces:
   Session, VoiceChunk, SentimentStore, EntityStore, Entity, Relationship,
   Character, ContextMessage, EvaluatorResult, Chapter, Book, SessionStatus
   (SessionStatus = 'recording'|'processing_chunk'|'awaiting_user'|'generating_book'|'book_ready'|'failed')
5. src/lib/supabase.ts: Supabase client using EXPO_PUBLIC_ env vars + AsyncStorage
6. Create .env.local with placeholder EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY

--- PHASE 2: AUTH ---
CHANGE: Use Email OTP (not phone). Supabase supports this natively.

7. src/store/auth.ts — Zustand store with:
   - initialize(): supabase.auth.onAuthStateChange, set state
   - sendOTP(email: string): supabase.auth.signInWithOtp({ email })
   - verifyOTP(email: string, token: string): supabase.auth.verifyOtp({ email, token, type: 'email' })
   - signOut(): supabase.auth.signOut()

8. src/app/_layout.tsx — Root layout with auth redirect logic

9. src/app/auth/email.tsx (NOT phone.tsx):
   Dark background (#050508), amber aesthetic, Cormorant Garamond
   Input: email address field
   Button: "Send me a code" in amber
   No country code picker needed

10. src/app/auth/verify.tsx:
    "Enter the 6-digit code sent to {email}"
    Six individual TextInput boxes, auto-advance
    Auto-submit when all 6 entered
    "Resend code" with 60-second cooldown
    Back button to /auth/email

--- PHASE 3: SUPABASE EDGE FUNCTIONS ---
Run: supabase init && supabase functions new [name] for each:
transcribe-chunk, run-s-agent, run-e-agent, run-evaluator, 
run-clarification, process-chunk, run-breaker, run-proxy-writer, 
run-picasso, run-binder, generate-book

11. transcribe-chunk: fetch chunk → download audio → call Whisper API → update transcript → 
    append to context_messages → fire process-chunk (fire and forget)

12. run-s-agent: fetch all context_messages → call Claude claude-sonnet-4-5 with this EXACT system prompt:
"You are the Sentiment Analysis Agent for Kahoma. Analyze the transcript and extract emotional landscape.
Respond ONLY with valid JSON: { sentiment, tonality, story_direction, political_social_lens, 
predicted_future, confidence (0-100), key_emotional_moments: string[], narrator_current_emotional_state }"
→ UPSERT sentiment_store

13. run-e-agent: fetch context_messages + existing entity_store → call Claude with this EXACT system prompt:
"You are the Entity Extraction Agent for Kahoma. Extract ALL entities capturing THE NARRATOR'S PERSPECTIVE.
CRITICAL: A grandmother can be loving OR cruel depending on narrator's experience.
Respond ONLY with valid JSON: { entities: [{ entity_id, type, name, user_perspective, emotional_charge, attributes, mentioned_in_chunks }], relationships: [{ from, to, type, narrator_framing }], new_characters_this_chunk: string[] }"
→ UPSERT entity_store

14. run-evaluator: fetch context_messages + sentiment_store + entity_store → call Claude:
"You are the Evaluator Agent. Score understanding 0-100. Threshold: 80.
Score dimensions: entity_completeness(25), relationship_clarity(20), sentiment_confidence(20), perspective_accuracy(20), story_coherence(15).
Respond ONLY with valid JSON: { overall_score, dimension_scores, decision: 'acknowledge'|'ask', gaps: string[], question_to_ask: string|null, catastrophic_gap: boolean, new_characters_needing_photo: string[] }"

15. run-clarification: receive evaluator_result → call Claude to generate warm response →
    insert into context_messages as 'assistant' → update session.status = 'awaiting_user'

16. process-chunk (ORCHESTRATOR): 
    → update session.status = 'processing_chunk'
    → run S-Agent + E-Agent in PARALLEL (Promise.all)
    → run Evaluator
    → run Clarification Agent
    → update session.status = 'awaiting_user'
    → on ANY failure: still run clarification with acknowledge fallback

17. run-breaker: fetch Bible (S+E+context) → call Claude:
"You are the Breaker Agent. Think like Premchand, Amrita Pritam. Find optimal chapter order — NOT necessarily chronological.
Respond ONLY with valid JSON: { book_title, book_subtitle, narrative_structure, chapters: [{ chapter_number, title, era, primary_location, primary_character, emotional_arc, relevant_transcript_sections: string[], image_concept }], total_chapters }"
→ insert all chapters → insert books record

18. run-proxy-writer: fetch chapter → call Claude:
"You are the Proxy Writer — 40 years experience. PRESERVE NARRATOR'S PERSPECTIVE ABSOLUTELY.
Write 400-700 words. First person. Vivid sensory details. Drop cap opening. No bullet points.
DO NOT sanitize. DO NOT add false hope."
→ update chapter.content_written, status='written'

19. run-picasso: for characters with photo_url → Replicate img2img era-transform.
    For chapters without photo → Replicate text-to-image from image_concept.
    Poll every 5s, 5min timeout. Log failures, never abort.

20. run-binder: fetch all chapters + images → build complete book HTML with:
    CSS: Cormorant Garamond, A5 size, drop caps, full-width chapter images, TOC, cover page
    → POST to PDFShift API → upload PDF to books/{session_id}/kahoma_book.pdf
    → update books.pdf_url, session.status = 'book_ready'

21. generate-book (ORCHESTRATOR): 
    session.phase=2, status='generating_book' → Breaker → Proxy Writer (sequential per chapter) → Picasso → Binder

--- PHASE 4: UI SCREENS ---
22. src/hooks/useRecording.ts: expo-av recording with metering, auto-stop at 10min
23. src/lib/uploadService.ts: createSession(), uploadChunk() (fires transcribe-chunk), uploadCharacterPhoto()
24. src/app/session/[id].tsx: Chat UI with recording/processing/awaiting modes. 
    Real-time context_messages via Supabase Realtime. Auto-scroll. Warm amber dark aesthetic.
25. src/app/(tabs)/index.tsx: Home with empty state, recent sessions, "+ New Story" button
26. src/components/SessionCard.tsx: Status badges, tap handler
27. src/app/book/[id].tsx: Generating animation → Book reveal → PDF open/download/share
28. src/app/onboarding.tsx: 3-screen sacred onboarding. Tone: warm, safe, poetic. 
    Screen 1: "Some stories wait a lifetime." 
    Screen 2: "Just speak. We understand." 
    Screen 3: Privacy promise + mic permission request

--- DATABASE (run this in Supabase SQL Editor) ---
Create tables: sessions, voice_chunks, sentiment_store, entity_store, 
context_messages, characters, chapters, books, processing_log
With: UUID PKs, RLS enabled, user-owns-own-data policies, Realtime on sessions/context_messages/chapters/books
Enable storage buckets: audio (200MB), photos (20MB), books (50MB) — all private

--- COMPLETION CRITERIA ---
When done, I should be able to:
1. Log in with email and email OTP
2. Record a 3-minute story
3. See AI respond warmly in a chat interface
4. Tap "That's my story"
5. Wait 5 minutes
6. Open a real PDF book with chapters, images, literary prose

Build everything. Show me what you've built after each phase. 
Ask me before moving to the next phase.