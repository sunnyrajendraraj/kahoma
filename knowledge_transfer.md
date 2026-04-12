# Kahoma — Complete Knowledge Transfer Document

> **Generated:** April 12, 2026  
> **Version:** 1.0.0  
> **Commit:** `aaf7c10` (master)  
> **Purpose:** Zero-loss knowledge transfer for any new developer or AI agent

---

# 1. PROJECT OVERVIEW

## Project Name
**Kahoma** (sometimes written as "Kahomaa" in repo name)

## What Is This Product?
Kahoma is a **voice-first memoir creation platform** — a mobile app that lets users speak their life stories into their phone, and through a multi-agent AI pipeline, transforms those raw voice recordings into a beautifully written, publication-ready book (PDF/HTML).

## Why Was It Built?
The core belief: **every life holds a story worth telling, but most people will never write a book.** Kahoma removes the barrier of writing by letting users simply *talk*. The AI handles everything else — understanding, structuring, writing, illustrating, and publishing.

## Problem Statement
- Most people have rich life stories but lack the time, skill, or discipline to write them
- Traditional memoir writing requires months/years of effort
- Ghostwriters are expensive ($10,000–$100,000+)
- Voice-to-text alone produces unusable transcripts, not readable prose
- Existing tools don't understand emotional nuance or cultural context

## Target Users
- **Indian families** (primary market) — preserving stories of grandparents, parents, elders
- Elderly individuals who prefer speaking over typing
- First-generation immigrants wanting to preserve origin stories
- Anyone with a story they've never told

## Key Value Proposition
1. **Voice-first**: Just speak in any language (Hindi, English, Hinglish)
2. **AI-powered understanding**: Not just transcription — emotional and relational understanding
3. **Literary-quality output**: Polished prose, not raw transcripts
4. **One-tap book**: Voice → published memoir in minutes
5. **Private and personal**: All data encrypted, user-owned

---

# 2. PRODUCT THINKING & INTENT

## Core Idea
A **6-agent AI pipeline** that mirrors how a skilled ghostwriter works:
1. First, **listen** and **understand** (transcribe, analyze emotion, extract people/places)
2. Then, **ask questions** like a good interviewer when something is unclear
3. Finally, **write** the book with literary flair, structure it into chapters, add images, and bind it

## Problems It Solves
| Problem | Kahoma's Solution |
|---------|-------------------|
| "I can't write" | Just speak |
| "My story is in Hindi/Hinglish" | Whisper handles multilingual transcription |
| "Who would structure my story?" | Breaker agent creates chapter structure |
| "Raw transcripts are unreadable" | ProxyWriter produces literary prose |
| "I want a real book, not a doc" | Binder generates PDF with images |
| "What if the AI misunderstands?" | Evaluator + Clarification agents ask questions |

## Design Philosophy
- **AI-first**: Every major decision point uses a specialized AI agent
- **Voice-first**: The primary input is spoken word, not typed text
- **Narrator-centric**: The AI preserves the narrator's *subjective* perspective — their opinion of people, not objective truth
- **Graceful degradation**: If any agent fails, the pipeline continues and the user always gets *something*
- **Mock-first development**: Every function supports MOCK_MODE for cost-free testing

## Alternatives Considered (Inferred)
- Simple voice-to-text + ChatGPT → lacks structure, emotional depth, no iterative understanding
- Traditional chatbot memoir apps → no multi-agent pipeline, no quality gating
- Professional ghostwriting platforms → too expensive, too slow

---

# 3. CURRENT STATUS

## What Is Completed (v1 Scope)
- ✅ Full React Native (Expo) mobile app — all screens, navigation, components
- ✅ Email OTP authentication via Supabase Auth
- ✅ Onboarding flow (3-slide carousel)
- ✅ Voice recording with metering/waveform visualization
- ✅ Audio upload to Supabase Storage
- ✅ All 11 Supabase Edge Functions deployed and active
- ✅ MOCK_MODE in all functions for free testing
- ✅ Complete database schema (9 tables, RLS, indexes, triggers)
- ✅ Real-time subscriptions (sessions + messages update live)
- ✅ Book generation pipeline (Breaker → Writer → Picasso → Binder)
- ✅ Book viewing/download/sharing screen
- ✅ Android APK built (96.6 MB release build)
- ✅ Full end-to-end test passed (with mock data)
- ✅ Supabase auth config fixed (email OTP, not confirmation links)

## What Is Partially Implemented
- ⚠️ Real AI mode (all API integrations coded but untested with real keys — only MOCK_MODE tested)
- ⚠️ Image generation (Picasso agent coded for Replicate but mock mode skips it entirely)
- ⚠️ PDF generation (Binder uses PDFShift in real mode but mock mode outputs HTML)

## What Is NOT Built Yet
- ❌ iOS build (Android only so far)
- ❌ Push notifications (for book readiness)
- ❌ Multiple language selection UI
- ❌ Editing/revising a generated book
- ❌ Book sharing to social media
- ❌ Payment/subscription system
- ❌ Analytics/tracking
- ❌ Admin panel
- ❌ App Store / Play Store listing
- ❌ User profile photo
- ❌ Session title editing
- ❌ Delete session / delete account

## Known Bugs & Limitations
1. **APK is unsigned (debug signing)** — can't be published to Play Store; only sideloading
2. **96.6 MB APK size** — bloated because it bundles all Expo modules; needs `expo-optimize`
3. **No offline support** — requires internet for all operations
4. **Recording max 10 minutes per chunk** — user must manually chunk long stories
5. **Supabase free tier limits** — 50MB database, 1GB storage, 500K edge function invocations/month
6. **No retry mechanism on client** — if edge function fails, user has to restart
7. **Book is HTML in mock mode** — not actual PDF; PDFShift needed for real PDF output

---

# 4. USER PERSONAS

## Primary Persona: "The Storytelling Elder"
- **Age:** 55-80
- **Tech comfort:** Low-medium (uses WhatsApp, can install APK with help)
- **Language:** Hindi, Hinglish, or English
- **Motivation:** Wants to preserve family stories for grandchildren
- **Pain point:** "I have so many stories but I can't write them down"

## Secondary Persona: "The Family Archivist"
- **Age:** 25-45
- **Tech comfort:** High
- **Language:** English/Hindi
- **Motivation:** Records parents'/grandparents' stories before it's too late
- **Pain point:** "My grandmother has amazing stories but she'll never write a book"

## Tertiary Persona: "The Immigrant"
- **Age:** 30-60
- **Language:** Multilingual
- **Motivation:** Preserve origin stories, cultural heritage for children raised abroad
- **Pain point:** "My kids don't know where we came from"

---

# 5. COMPLETE USER JOURNEY

## End-to-End Flow

### Step 1: First Launch
1. User downloads and installs the APK
2. App opens to **Email Auth screen** (dark background, amber "Kahoma" branding)
3. User enters their email address
4. Taps "Send me a code"
5. Supabase sends a **6-digit OTP** to their email
6. App navigates to **Verify screen** with 6 input boxes

### Step 2: OTP Verification
1. User enters the 6-digit code (auto-advances between boxes)
2. On final digit, auto-submits
3. Supabase verifies the OTP → creates user session
4. Auth state change detected by `_layout.tsx` → checks onboarding status

### Step 3: Onboarding (First Time Only)
1. **Slide 1:** "Some stories wait a lifetime" → Button: "I have a story"
2. **Slide 2:** "Just speak. We understand." → Button: "How does it work?"
3. **Slide 3:** "Your stories stay yours" → Button: "Begin my story"
4. Tapping "Begin my story" writes `kahoma_onboarded=true` to AsyncStorage AND Zustand store
5. Navigates to home screen

### Step 4: Home Screen (Empty State)
1. Shows pencil icon + "Every life holds a story worth telling"
2. "Begin yours" button

### Step 5: Creating a Session
1. User taps "Begin yours" (or floating "+" button on subsequent visits)
2. `createSession()` → inserts row in `sessions` table
3. Navigates to **Session Screen** (`/session/[id]`)

### Step 6: Recording (Phase 1 - Understanding)
1. Session screen shows mic icon + "Tap the mic button and start speaking"
2. User taps mic → requests microphone permission (first time)
3. **Recording state:** Amber mic button turns red ■ (pause), waveform animates, timer counts up
4. User speaks their story (up to 10 minutes per chunk)
5. Can pause/resume recording
6. Taps "Done" → recording stops → uploads to Supabase Storage

### Step 7: AI Processing Pipeline (Automatic)
1. `uploadChunk()` fires `transcribe-chunk` edge function (fire-and-forget)
2. UI shows "Uploading your recording..." status bar
3. `transcribe-chunk` → Whisper transcription → saves transcript → fires `process-chunk`
4. `process-chunk` runs:
   - S-Agent + E-Agent **in parallel** (sentiment analysis + entity extraction)
   - Evaluator scores understanding (>80 = acknowledge, <80 = ask question)
   - Clarification agent generates warm response
5. Response appears as chat bubble (real-time via Supabase Realtime)
6. Session status changes back to `awaiting_user`

### Step 8: Iterative Storytelling
1. AI response appears as amber chat bubble with "K" avatar
2. If evaluator decided "ask" → bubble contains a gentle clarifying question
3. If evaluator decided "acknowledge" → warm acknowledgement + "please continue"
4. User records another chunk → pipeline repeats
5. Each iteration enriches the Sentiment Store, Entity Store, and Context Window

### Step 9: Book Generation (Phase 2)
1. After recording enough, "That's my story →" button appears
2. User taps it → confirmation dialog: "We'll start creating your book"
3. Taps "Yes, that's my story" → triggers `generate-book` edge function
4. Navigates to **Book Screen** (`/book/[id]`)

### Step 10: Book Creation Progress
1. Book screen shows "We're writing your story..." with animated dots
2. Pipeline runs: Breaker → ProxyWriter (per chapter) → Picasso → Binder
3. Real-time updates show "N chapters written..."
4. Takes ~5 minutes with real APIs, ~10 seconds in mock mode

### Step 11: Book Ready
1. Book cover component displays (title, author name, year)
2. Three action buttons:
   - **"Read My Book"** → opens signed URL in browser
   - **"Download"** → saves to device
   - **"Share"** → native share sheet
3. Shows page count

### Edge Cases
- **Recording permission denied:** Sets `permissionDenied` state, shows nothing (needs UI improvement)
- **Upload failure:** Shows error alert, user can try recording again
- **Agent failure:** Fallback response: "Thank you for sharing that. Please continue."
- **Book generation failure:** Shows error screen with "Go Back" button
- **Session already has book:** Home screen routes directly to `/book/[id]`
- **Auth token expired:** Supabase auto-refreshes tokens; if fails, shows auth screen

---

# 6. SCREEN-BY-SCREEN BREAKDOWN

## Screen 1: Email Auth (`/auth/email`)

| Property | Detail |
|----------|--------|
| **Purpose** | Collect user email for OTP login |
| **File** | `src/app/auth/email.tsx` |
| **UI Components** | KeyboardAvoidingView, TextInput, TouchableOpacity |
| **Data Displayed** | "Kahoma" brand, tagline |
| **User Actions** | Enter email, tap "Send me a code" |
| **Validation** | Checks for `@` in email, trims and lowercases |
| **API Calls** | `supabase.auth.signInWithOtp({ email })` |
| **State** | Uses `useAuthStore` (loading, sendOTP) |
| **Navigation** | On success → `/auth/verify?email=xxx` |

## Screen 2: OTP Verify (`/auth/verify`)

| Property | Detail |
|----------|--------|
| **Purpose** | 6-digit OTP verification |
| **File** | `src/app/auth/verify.tsx` |
| **UI Components** | 6 individual TextInput boxes, resend timer |
| **Data Displayed** | Email address, cooldown timer (60s) |
| **User Actions** | Enter code (auto-advances), resend code |
| **Auto-submit** | Triggers when 6th digit entered |
| **API Calls** | `supabase.auth.verifyOtp({ email, token, type: 'email' })` |
| **State** | Uses `useAuthStore` (verifyOTP, sendOTP, loading) |
| **Navigation** | On success → auth state change → `_layout.tsx` handles routing |

## Screen 3: Onboarding (`/onboarding`)

| Property | Detail |
|----------|--------|
| **Purpose** | First-time user introduction (3 slides) |
| **File** | `src/app/onboarding.tsx` |
| **UI Components** | FlatList (horizontal, pagingEnabled), dot indicators |
| **Slides** | 1) "I have a story" 2) "How does it work?" 3) "Begin my story" |
| **User Actions** | Swipe or tap button to advance |
| **State** | Uses `useAuthStore` (completeOnboarding) |
| **Persistence** | Writes `kahoma_onboarded=true` to AsyncStorage + Zustand |
| **Navigation** | On completion → `/(tabs)` |

## Screen 4: Home / Story List (`/(tabs)/index`)

| Property | Detail |
|----------|--------|
| **Purpose** | Lists all user's storytelling sessions |
| **File** | `src/app/(tabs)/index.tsx` |
| **UI Components** | FlatList of SessionCards, FAB button, empty state |
| **Data Displayed** | Session title, status badge, date |
| **Empty State** | Pencil icon + "Every life holds a story worth telling" + "Begin yours" |
| **User Actions** | Tap session → go to session/book; tap FAB → new session |
| **API Calls** | `supabase.from('sessions').select('*')` (ordered by date, limit 20) |
| **State** | `useSessionsStore` (sessions, loading, fetchSessions) |
| **Navigation** | Session card → `/session/[id]` or `/book/[id]`; New → creates session → `/session/[id]` |

## Screen 5: Profile (`/(tabs)/profile`)

| Property | Detail |
|----------|--------|
| **Purpose** | User info and sign out |
| **File** | `src/app/(tabs)/profile.tsx` |
| **UI Components** | Info cards, sign out button |
| **Data Displayed** | Email, book count |
| **User Actions** | Sign out |
| **API Calls** | `supabase.from('books').select('id', { count: 'exact' })` |
| **State** | `useAuthStore` (user, signOut) |

## Screen 6: Session / Recording (`/session/[id]`)

| Property | Detail |
|----------|--------|
| **Purpose** | Voice recording + AI conversation interface |
| **File** | `src/app/session/[id].tsx` |
| **UI Components** | ScrollView (chat), RecordButton, AudioWaveform, AgentStatusBar, ClarificationBubble, UserBubble |
| **Data Displayed** | Chat messages (user transcripts + AI responses), recording timer, waveform |
| **User Actions** | Record, pause, resume, discard, complete chunk, upload photo, generate book |
| **API Calls** | `uploadChunk()`, `generateBook()`, `uploadCharacterPhoto()` |
| **Hooks** | `useRecording()` (audio), `useSessionStatus()` (real-time) |
| **Real-time** | Subscribes to `sessions` + `context_messages` changes |
| **Navigation** | Auto-redirects to `/book/[id]` when status = `generating_book` or `book_ready` |

## Screen 7: Book (`/book/[id]`)

| Property | Detail |
|----------|--------|
| **Purpose** | Display generated book, download/share |
| **File** | `src/app/book/[id].tsx` |
| **UI Components** | BookCover, AgentStatusBar, action buttons |
| **Three States** | Generating (progress), Ready (cover + actions), Failed (error) |
| **User Actions** | Read (opens URL), Download (saves to device), Share (native sheet) |
| **API Calls** | `getBookPdfUrl()` → signed URL from Supabase Storage |
| **Real-time** | Subscribes to `books`, `sessions`, `chapters` changes |
| **Navigation** | Back button → previous screen |

---

# 7. SYSTEM ARCHITECTURE

## Overview
Kahoma follows a **mobile-first, serverless architecture** with a thick-client mobile app communicating with Supabase BaaS (Backend as a Service). All business logic runs in Supabase Edge Functions (Deno).

```mermaid
flowchart TD
    subgraph Mobile["📱 Mobile App (Expo/React Native)"]
        UI[UI Screens]
        Zustand[Zustand Store]
        Hooks[Custom Hooks]
        Services[Service Layer]
    end

    subgraph Supabase["☁️ Supabase Cloud"]
        Auth[Auth - Email OTP]
        DB[(PostgreSQL DB)]
        Storage[Storage Buckets]
        Realtime[Realtime Engine]
        
        subgraph EdgeFns["Edge Functions (Deno)"]
            TC[transcribe-chunk]
            PC[process-chunk]
            SA[run-s-agent]
            EA[run-e-agent]
            EV[run-evaluator]
            CL[run-clarification]
            GB[generate-book]
            BR[run-breaker]
            PW[run-proxy-writer]
            PI[run-picasso]
            BI[run-binder]
        end
    end

    subgraph ExternalAPIs["🌐 External AI APIs"]
        Whisper[OpenAI Whisper]
        Claude[Anthropic Claude]
        Replicate[Replicate - SDXL]
        PDFShift[PDFShift API]
    end

    UI --> Zustand
    UI --> Hooks
    Hooks --> Services
    Services --> Auth
    Services --> DB
    Services --> Storage
    Services --> EdgeFns
    Hooks --> Realtime
    Realtime --> DB

    TC --> Whisper
    SA --> Claude
    EA --> Claude
    EV --> Claude
    CL --> Claude
    BR --> Claude
    PW --> Claude
    PI --> Replicate
    BI --> PDFShift

    TC -->|fire-and-forget| PC
    PC --> SA
    PC --> EA
    PC --> EV
    PC --> CL

    GB --> BR
    GB --> PW
    GB --> PI
    GB --> BI
```

## Data Flow Summary
1. **Mobile → Supabase Storage**: Audio files, character photos
2. **Mobile → Supabase DB**: Session creation, chunk records
3. **Mobile → Edge Functions**: Trigger transcription and book generation
4. **Edge Functions → External APIs**: AI processing (Whisper, Claude, Replicate, PDFShift)
5. **Edge Functions → DB**: Write back results (transcripts, sentiment, entities, chapters, books)
6. **Supabase Realtime → Mobile**: Push session/message updates to UI in real-time

---

# 8. TECH STACK

## Frontend
| Technology | Version | Purpose |
|-----------|---------|---------|
| React Native | 0.81.5 | Cross-platform mobile framework |
| Expo | ~54.0.33 (SDK 54) | React Native toolchain & managed services |
| expo-router | ~6.0.23 (v6) | File-based routing |
| React | 19.1.0 | UI library |
| TypeScript | ~5.9.2 | Type safety |
| Zustand | ^5.0.12 | Lightweight state management |

## Backend
| Technology | Purpose |
|-----------|---------|
| Supabase Edge Functions | Serverless Deno functions (11 functions) |
| Supabase Auth | Email OTP authentication |
| Supabase Database | PostgreSQL (managed) |
| Supabase Storage | File storage (audio, photos, books) |
| Supabase Realtime | WebSocket-based real-time subscriptions |

## External AI Services
| Service | Model | Purpose |
|---------|-------|---------|
| OpenAI | Whisper (`whisper-1`) | Speech-to-text transcription |
| Anthropic | Claude Sonnet 4.5 (`claude-sonnet-4-5-20250514`) | All text AI (sentiment, entities, evaluation, writing) |
| Replicate | Stable Diffusion w/ ControlNet | Chapter image generation + photo era-transform |
| PDFShift | HTML → PDF API | Final book PDF rendering |

## Key Libraries
| Library | Version | Purpose |
|---------|---------|---------|
| `@supabase/supabase-js` | ^2.103.0 | Supabase client SDK |
| `expo-av` | ~16.0.8 | Audio recording |
| `expo-file-system` | ~19.0.21 | File management, downloads |
| `expo-image-picker` | ~17.0.10 | Character photo selection |
| `expo-sharing` | ~14.0.8 | Native share sheet |
| `expo-linking` | ~8.0.11 | Open URLs (for book reading) |
| `expo-media-library` | ~18.2.1 | Device media access |
| `@react-native-async-storage/async-storage` | 2.2.0 | Local KV storage (onboarding flag, auth tokens) |
| `react-native-url-polyfill` | ^3.0.0 | URL API polyfill for Supabase |
| `react-native-gesture-handler` | ~2.28.0 | Touch handling |
| `react-native-safe-area-context` | ~5.6.0 | Safe area insets |
| `react-native-screens` | ~4.16.0 | Native screen management |
| `@expo/vector-icons` | ^15.0.3 | Ionicons icon set |

## Build & Dev Tools
| Tool | Purpose |
|------|---------|
| Expo CLI | Development server, build tools |
| Supabase CLI (v2.89.1) | Edge function deployment, project management |
| Android SDK | APK compilation |
| Gradle | Android build system |
| NDK 27.1.12297006 | Native build support |
| Kotlin 2.1.20 | Android Kotlin version |

---

# 9. SUPABASE / DATABASE ARCHITECTURE

## Supabase Project Details
- **Project Ref:** `bgyvfktnjzqhgrradvhh`
- **URL:** `https://bgyvfktnjzqhgrradvhh.supabase.co`
- **Region:** (Supabase free tier, default region)
- **Plan:** Free tier

## Database Schema (9 Tables)

### Table: `sessions`
| Column | Type | Default | Notes |
|--------|------|---------|-------|
| id | uuid | `gen_random_uuid()` | PK |
| user_id | uuid | — | FK → auth.users, NOT NULL |
| title | text | `'My Story'` | |
| status | text | `'recording'` | Enum: recording, processing_chunk, awaiting_user, generating_book, book_ready, failed |
| phase | integer | `1` | 1=understanding, 2=generation |
| error_message | text | null | |
| created_at | timestamptz | `now()` | |
| updated_at | timestamptz | `now()` | Auto-updated via trigger |

### Table: `voice_chunks`
| Column | Type | Default | Notes |
|--------|------|---------|-------|
| id | uuid | `gen_random_uuid()` | PK |
| session_id | uuid | — | FK → sessions |
| user_id | uuid | — | FK → auth.users |
| audio_url | text | null | Storage path |
| transcript | text | null | Filled by transcribe-chunk |
| chunk_order | integer | — | NOT NULL, sequential |
| whisper_status | text | `'pending'` | pending → transcribing → done/failed |
| created_at | timestamptz | `now()` | |

### Table: `sentiment_store`
| Column | Type | Default | Notes |
|--------|------|---------|-------|
| id | uuid | `gen_random_uuid()` | PK |
| session_id | uuid | — | UNIQUE FK → sessions |
| sentiment | text | null | e.g., "nostalgic" |
| tonality | text | null | e.g., "warm with undercurrents of loss" |
| story_direction | text | null | |
| predicted_future | text | null | |
| confidence_score | integer | null | 0-100 |
| raw_output | jsonb | `'{}'` | Full Claude response |
| updated_at | timestamptz | `now()` | Auto-updated |

**Note:** One row per session, always UPSERT on `session_id`.

### Table: `entity_store`
| Column | Type | Default | Notes |
|--------|------|---------|-------|
| id | uuid | `gen_random_uuid()` | PK |
| session_id | uuid | — | UNIQUE FK → sessions |
| entities | jsonb | `'[]'` | Array of Entity objects |
| relationships | jsonb | `'[]'` | Array of Relationship objects |
| raw_output | jsonb | `'{}'` | Full Claude response |
| updated_at | timestamptz | `now()` | Auto-updated |

**Note:** One row per session, always UPSERT on `session_id`.

### Table: `context_messages`
| Column | Type | Default | Notes |
|--------|------|---------|-------|
| id | uuid | `gen_random_uuid()` | PK |
| session_id | uuid | — | FK → sessions |
| role | text | — | CHECK: 'user' or 'assistant' |
| content | text | — | NOT NULL |
| chunk_id | uuid | null | FK → voice_chunks |
| message_order | integer | null | Sequential per session |
| created_at | timestamptz | `now()` | |

**Note:** Append-only log. User messages = transcripts; assistant messages = AI responses.

### Table: `characters`
| Column | Type | Default | Notes |
|--------|------|---------|-------|
| id | uuid | `gen_random_uuid()` | PK |
| session_id | uuid | — | FK → sessions |
| name | text | — | NOT NULL |
| relationship_to_narrator | text | null | e.g., "paternal grandmother" |
| birth_era | text | null | e.g., "1930s" |
| photo_url | text | null | User-uploaded photo path |
| photo_era_transformed_url | text | null | AI era-transformed photo |
| photo_requested | boolean | `false` | Whether AI asked for photo |
| created_at | timestamptz | `now()` | |

### Table: `chapters`
| Column | Type | Default | Notes |
|--------|------|---------|-------|
| id | uuid | `gen_random_uuid()` | PK |
| session_id | uuid | — | FK → sessions |
| chapter_number | integer | — | NOT NULL |
| title | text | null | e.g., "The Smell of Tulsi at Dawn" |
| era | text | null | e.g., "1960s" |
| location | text | null | e.g., "Lucknow" |
| transcript_segments | jsonb | `'[]'` | Relevant transcript excerpts |
| content_written | text | null | Full literary prose |
| image_url | text | null | Generated chapter image |
| image_prompt | text | null | Prompt used for image generation |
| emotional_arc | text | null | e.g., "warmth → longing" |
| status | text | `'pending'` | pending → written |
| created_at | timestamptz | `now()` | |

### Table: `books`
| Column | Type | Default | Notes |
|--------|------|---------|-------|
| id | uuid | `gen_random_uuid()` | PK |
| session_id | uuid | — | UNIQUE FK → sessions |
| user_id | uuid | — | FK → auth.users |
| pdf_url | text | null | Storage path to PDF/HTML |
| cover_title | text | null | Book title |
| author_name | text | null | |
| status | text | `'pending'` | pending → generating → ready |
| page_count | integer | null | |
| created_at | timestamptz | `now()` | |

### Table: `processing_log`
| Column | Type | Default | Notes |
|--------|------|---------|-------|
| id | uuid | `gen_random_uuid()` | PK |
| session_id | uuid | null | |
| chunk_id | uuid | null | |
| event | text | null | e.g., "transcription_done", "book_generated" |
| data | jsonb | null | Event-specific metadata |
| created_at | timestamptz | `now()` | |

**Note:** Audit trail — no RLS (edge functions write directly).

## ER Diagram

```mermaid
erDiagram
    AUTH_USERS ||--o{ SESSIONS : "owns"
    AUTH_USERS ||--o{ VOICE_CHUNKS : "records"
    AUTH_USERS ||--o{ BOOKS : "creates"
    
    SESSIONS ||--o{ VOICE_CHUNKS : "contains"
    SESSIONS ||--o| SENTIMENT_STORE : "has one"
    SESSIONS ||--o| ENTITY_STORE : "has one"
    SESSIONS ||--o{ CONTEXT_MESSAGES : "contains"
    SESSIONS ||--o{ CHARACTERS : "extracts"
    SESSIONS ||--o{ CHAPTERS : "structures"
    SESSIONS ||--o| BOOKS : "produces"
    SESSIONS ||--o{ PROCESSING_LOG : "logs"
    
    VOICE_CHUNKS ||--o{ CONTEXT_MESSAGES : "generates"

    SESSIONS {
        uuid id PK
        uuid user_id FK
        text title
        text status
        integer phase
        text error_message
        timestamptz created_at
        timestamptz updated_at
    }

    VOICE_CHUNKS {
        uuid id PK
        uuid session_id FK
        uuid user_id FK
        text audio_url
        text transcript
        integer chunk_order
        text whisper_status
    }

    SENTIMENT_STORE {
        uuid id PK
        uuid session_id FK_UNIQUE
        text sentiment
        text tonality
        text story_direction
        integer confidence_score
        jsonb raw_output
    }

    ENTITY_STORE {
        uuid id PK
        uuid session_id FK_UNIQUE
        jsonb entities
        jsonb relationships
        jsonb raw_output
    }

    CONTEXT_MESSAGES {
        uuid id PK
        uuid session_id FK
        text role
        text content
        uuid chunk_id FK
        integer message_order
    }

    CHARACTERS {
        uuid id PK
        uuid session_id FK
        text name
        text relationship_to_narrator
        text birth_era
        text photo_url
        text photo_era_transformed_url
        boolean photo_requested
    }

    CHAPTERS {
        uuid id PK
        uuid session_id FK
        integer chapter_number
        text title
        text era
        text location
        jsonb transcript_segments
        text content_written
        text image_url
        text emotional_arc
        text status
    }

    BOOKS {
        uuid id PK
        uuid session_id FK_UNIQUE
        uuid user_id FK
        text pdf_url
        text cover_title
        text author_name
        text status
        integer page_count
    }

    PROCESSING_LOG {
        uuid id PK
        uuid session_id
        uuid chunk_id
        text event
        jsonb data
    }
```

## Row-Level Security (RLS)
All tables except `processing_log` have RLS enabled.

| Table | Policy | Rule |
|-------|--------|------|
| sessions | `own_sessions` | `auth.uid() = user_id` |
| voice_chunks | `own_chunks` | `auth.uid() = user_id` |
| sentiment_store | `own_sentiment` | `session_id IN (SELECT id FROM sessions WHERE user_id = auth.uid())` |
| entity_store | `own_entities` | Same as above |
| context_messages | `own_messages` | Same as above |
| characters | `own_characters` | Same as above |
| chapters | `own_chapters` | Same as above |
| books | `own_books` | `auth.uid() = user_id` |

**Important:** Edge functions use the `service_role` key which bypasses RLS. This is intentional — the pipeline needs to write data for any user.

## Storage Buckets
| Bucket | Max File Size | Contents |
|--------|--------------|----------|
| `audio` | 200MB | Voice recording chunks (.m4a) |
| `photos` | 20MB | Character photos (.jpg) + era-transformed versions |
| `books` | 50MB | Final PDF/HTML book files |

**Storage path pattern:** `{user_id}/{session_id}/{filename}`

## Auth Flow
- **Method:** Email OTP (Magic Code)
- **Provider:** Supabase Auth (GoTruth)
- **OTP Length:** 6 digits
- **OTP Expiry:** 60 minutes
- **Auto-confirm:** Enabled (no email confirmation link required)
- **Site URL:** `kahoma://` (deep link scheme)
- **Session persistence:** AsyncStorage (via `@supabase/supabase-js` config)
- **Token refresh:** Automatic (`autoRefreshToken: true`)

## Realtime Subscriptions
Enabled on 4 tables:
1. `sessions` — status changes (recording → processing → awaiting_user → etc.)
2. `context_messages` — new AI responses appear in real-time
3. `chapters` — track chapter writing progress during book generation
4. `books` — book status changes (generating → ready)

---

# 10. COMPONENT ARCHITECTURE

## Folder Structure

```
F:\kahomaa\Kahoma\
├── app.json                    # Expo config
├── package.json                # Dependencies
├── tsconfig.json               # TypeScript config
├── index.ts                    # Entry point (expo-router/entry)
├── .env.local                  # Environment variables
├── android/                    # Native Android project
│   ├── local.properties        # Android SDK path
│   └── app/build/outputs/apk/  # Built APKs
├── src/
│   ├── app/                    # File-based routing (expo-router)
│   │   ├── _layout.tsx         # Root layout (auth guard, navigation)
│   │   ├── onboarding.tsx      # Onboarding carousel
│   │   ├── auth/
│   │   │   ├── email.tsx       # Email input screen
│   │   │   └── verify.tsx      # OTP verification screen
│   │   ├── (tabs)/
│   │   │   ├── _layout.tsx     # Tab navigator (home + profile)
│   │   │   ├── index.tsx       # Home / session list
│   │   │   └── profile.tsx     # Profile & sign out
│   │   ├── session/
│   │   │   └── [id].tsx        # Recording/conversation screen
│   │   └── book/
│   │       └── [id].tsx        # Book viewing screen
│   ├── components/             # Reusable UI components
│   │   ├── AgentStatusBar.tsx  # "Processing..." indicator with animated dots
│   │   ├── AudioWaveform.tsx   # Real-time audio level bars
│   │   ├── BookCover.tsx       # Book cover display (title, author, ornament)
│   │   ├── ClarificationBubble.tsx  # AI message bubble (left-aligned, "K" avatar)
│   │   ├── RecordButton.tsx    # Mic/pause button with state colors
│   │   ├── SessionCard.tsx     # Session list item (title, status, date)
│   │   └── UserBubble.tsx      # User message bubble (right-aligned)
│   ├── hooks/                  # Custom React hooks
│   │   ├── useRecording.ts     # Audio recording state machine
│   │   └── useSessionStatus.ts # Real-time session + message subscriptions
│   ├── lib/                    # Service layer
│   │   ├── supabase.ts         # Supabase client initialization
│   │   ├── uploadService.ts    # Session creation, chunk upload, photo upload
│   │   ├── pdfService.ts       # Book URL + generate-book trigger
│   │   └── bibleService.ts     # Assemble Bible (sentiment + entity + context)
│   ├── store/                  # Zustand state stores
│   │   ├── auth.ts             # Auth state (user, session, onboarded, OTP flow)
│   │   └── sessions.ts         # Session list state
│   └── types/
│       └── index.ts            # All TypeScript interfaces (13 types)
├── supabase/
│   ├── config.toml             # Local Supabase config
│   ├── migrations/
│   │   └── 001_initial.sql     # Complete database schema
│   └── functions/              # 11 Deno edge functions
│       ├── transcribe-chunk/index.ts
│       ├── process-chunk/index.ts
│       ├── run-s-agent/index.ts
│       ├── run-e-agent/index.ts
│       ├── run-evaluator/index.ts
│       ├── run-clarification/index.ts
│       ├── generate-book/index.ts
│       ├── run-breaker/index.ts
│       ├── run-proxy-writer/index.ts
│       ├── run-picasso/index.ts
│       └── run-binder/index.ts
└── assets/                     # App icons and splash
    ├── icon.png
    ├── splash-icon.png
    ├── adaptive-icon.png
    └── favicon.png
```

## Component Responsibilities

### Screens (in `src/app/`)
| Component | Role |
|-----------|------|
| `_layout.tsx` | Root auth guard — checks user + onboarding, redirects accordingly |
| `auth/email.tsx` | Email input for OTP |
| `auth/verify.tsx` | 6-digit OTP entry with auto-submit |
| `onboarding.tsx` | 3-slide intro carousel |
| `(tabs)/_layout.tsx` | Tab navigator (2 tabs: home + profile) |
| `(tabs)/index.tsx` | Session list + empty state + new session creation |
| `(tabs)/profile.tsx` | User info + sign out |
| `session/[id].tsx` | Voice recording + chat conversation + book trigger |
| `book/[id].tsx` | Book progress + cover + read/download/share |

### Reusable Components (in `src/components/`)
| Component | Props | Role |
|-----------|-------|------|
| `RecordButton` | `isRecording, isPaused, onPress, size` | Mic/pause button with color states (amber/red) |
| `AudioWaveform` | `levels, isActive` | 30 animated bars showing audio input levels |
| `ClarificationBubble` | `content, timestamp` | AI chat bubble (left-aligned, amber "K" avatar) |
| `UserBubble` | `content, timestamp` | User chat bubble (right-aligned, dark bg) |
| `AgentStatusBar` | `message` | "Processing..." bar with animated dots |
| `BookCover` | `title, authorName, year` | Book cover with ornament, border, typography |
| `SessionCard` | `title, status, date, onPress` | Session list item with status color dot |

### Hooks (in `src/hooks/`)
| Hook | Returns | Role |
|------|---------|------|
| `useRecording()` | `recordingState, durationMillis, audioLevels, startRecording, pauseRecording, resumeRecording, stopAndGetUri, discardRecording` | Full audio recording state machine using expo-av |
| `useSessionStatus(sessionId)` | `session, messages, loading, refetch` | Real-time subscription to session + messages |

### Stores (in `src/store/`)
| Store | State | Role |
|-------|-------|------|
| `useAuthStore` | `user, session, loading, initialized, onboarded` | Auth lifecycle, OTP flow, onboarding flag |
| `useSessionsStore` | `sessions, loading` | Session list fetching + caching |

### Services (in `src/lib/`)
| Service | Functions | Role |
|---------|-----------|------|
| `supabase.ts` | `supabase` client | Configured Supabase client with AsyncStorage |
| `uploadService.ts` | `createSession(), uploadChunk(), uploadCharacterPhoto()` | Data creation + file upload + function invocation |
| `pdfService.ts` | `getBookPdfUrl(), generateBook()` | Book URL retrieval + generation trigger |
| `bibleService.ts` | `assembleBible()` | Combines sentiment + entity + context for Phase 2 |

---

# 11. API & DATA FLOW

## Edge Function Endpoints

All functions are at: `https://bgyvfktnjzqhgrradvhh.supabase.co/functions/v1/{function-name}`

| Function | Method | Input | Output | Trigger |
|----------|--------|-------|--------|---------|
| `transcribe-chunk` | POST | `{ chunk_id }` | `{ success, transcript }` | Client (after upload) |
| `process-chunk` | POST | `{ session_id, chunk_id? }` | `{ success, evaluator_score, agent_errors }` | transcribe-chunk (fire-and-forget) |
| `run-s-agent` | POST | `{ session_id }` | `{ success, output }` | process-chunk |
| `run-e-agent` | POST | `{ session_id }` | `{ success, output, new_characters }` | process-chunk |
| `run-evaluator` | POST | `{ session_id }` | `{ success, result }` | process-chunk |
| `run-clarification` | POST | `{ session_id, evaluator_result }` | `{ success, message, decision }` | process-chunk |
| `generate-book` | POST | `{ session_id }` | `{ success, book_title, pdf_url }` | Client (user taps "That's my story") |
| `run-breaker` | POST | `{ session_id }` | `{ success, chapters, book_id, book_title }` | generate-book |
| `run-proxy-writer` | POST | `{ session_id, chapter_id }` | `{ success, chapter_id, word_count }` | generate-book (per chapter) |
| `run-picasso` | POST | `{ session_id }` | `{ success, images_generated, images_failed }` | generate-book |
| `run-binder` | POST | `{ session_id }` | `{ success, pdf_url }` | generate-book |

## Phase 1: Understanding Pipeline

```mermaid
sequenceDiagram
    participant U as User
    participant App as Mobile App
    participant SB as Supabase Storage
    participant DB as PostgreSQL
    participant TC as transcribe-chunk
    participant PC as process-chunk
    participant SA as run-s-agent
    participant EA as run-e-agent
    participant EV as run-evaluator
    participant CL as run-clarification
    participant RT as Realtime

    U->>App: Records voice
    App->>SB: Upload audio (.m4a)
    App->>DB: Insert voice_chunk record
    App->>TC: Invoke (fire-and-forget)
    
    TC->>DB: Update whisper_status = "transcribing"
    Note over TC: Whisper API transcription
    TC->>DB: Save transcript + status = "done"
    TC->>DB: Insert context_message (role=user)
    TC->>PC: Invoke (fire-and-forget)
    
    PC->>DB: Set session status = "processing_chunk"
    
    par Parallel Analysis
        PC->>SA: Invoke S-Agent
        SA->>DB: Upsert sentiment_store
        SA-->>PC: Return sentiment output
    and
        PC->>EA: Invoke E-Agent
        EA->>DB: Upsert entity_store
        EA->>DB: Insert characters (if new)
        EA-->>PC: Return entities + new_characters
    end
    
    PC->>EV: Invoke Evaluator
    EV-->>PC: Return score + decision (ask/acknowledge)
    
    PC->>CL: Invoke Clarification
    CL->>DB: Insert context_message (role=assistant)
    CL->>DB: Set session status = "awaiting_user"
    CL-->>PC: Return message
    
    RT->>App: Push new context_message
    RT->>App: Push session status update
    App->>U: Display AI response bubble
```

## Phase 2: Book Generation Pipeline

```mermaid
sequenceDiagram
    participant U as User
    participant App as Mobile App
    participant GB as generate-book
    participant BR as run-breaker
    participant PW as run-proxy-writer
    participant PI as run-picasso
    participant BI as run-binder
    participant DB as PostgreSQL
    participant SB as Storage
    participant RT as Realtime

    U->>App: Taps "That's my story"
    App->>GB: Invoke generate-book
    
    GB->>DB: Set phase=2, status="generating_book"
    RT->>App: Push status → show "Writing your story..." screen
    
    GB->>BR: Invoke Breaker
    BR->>DB: Insert chapters (3-5)
    BR->>DB: Insert book record
    BR-->>GB: Return chapters + book_id
    
    loop For each chapter
        GB->>PW: Invoke ProxyWriter(chapter_id)
        PW->>DB: Update chapter.content_written
        PW->>DB: Set chapter.status = "written"
        RT->>App: Push chapter update (counter++)
        PW-->>GB: Return word_count
    end
    
    GB->>PI: Invoke Picasso (all chapters)
    PI->>DB: Update chapter.image_url (if generated)
    PI-->>GB: Return images_generated/failed
    
    GB->>BI: Invoke Binder
    BI->>SB: Upload book PDF/HTML
    BI->>DB: Update book (pdf_url, status="ready")
    BI->>DB: Set session status = "book_ready"
    BI-->>GB: Return pdf_url
    
    RT->>App: Push book ready
    App->>U: Show book cover + Read/Download/Share
```

---

# 12. STATE MANAGEMENT

## Architecture
Kahoma uses **Zustand** for global state and **React useState/useCallback** for local component state. No Redux, no Context API.

## Global State (Zustand)

### `useAuthStore` — Authentication + User State
```typescript
{
  user: User | null,           // Supabase auth user object
  session: SupabaseSession | null, // Supabase auth session
  loading: boolean,            // Auth operation in progress
  initialized: boolean,        // Auth check completed
  onboarded: boolean | null,   // AsyncStorage flag loaded
}
```
**Actions:** `initialize()`, `completeOnboarding()`, `sendOTP(email)`, `verifyOTP(email, token)`, `signOut()`

### `useSessionsStore` — Session List
```typescript
{
  sessions: Session[],   // Array of user's sessions
  loading: boolean,      // Fetch in progress
}
```
**Actions:** `fetchSessions(userId)`

## Local State (Component-Level)
| Component | State | Purpose |
|-----------|-------|---------|
| `session/[id].tsx` | `chunkOrder, uploading` | Track recording count + upload status |
| `book/[id].tsx` | `book, session, loading, chaptersReady` | Book data + progress counter |
| `useRecording` hook | `recordingState, durationMillis, audioLevels` | Audio recording machine |
| `useSessionStatus` hook | `session, messages, loading` | Live session data |

## Persistence
| Data | Storage | Lifetime |
|------|---------|----------|
| Auth tokens | AsyncStorage (via Supabase SDK) | Until sign out |
| Onboarding flag | AsyncStorage (`kahoma_onboarded`) | Permanent |
| Session data | Supabase PostgreSQL | Cloud-persistent |
| Audio files | Supabase Storage | Cloud-persistent |

## Real-time Sync
The `useSessionStatus` hook subscribes to Supabase Realtime using PostgreSQL `postgres_changes`:
- **Session updates:** `UPDATE` on `sessions` where `id=eq.{sessionId}`
- **New messages:** `INSERT` on `context_messages` where `session_id=eq.{sessionId}`

The `book/[id].tsx` screen subscribes to:
- **Book updates:** `*` on `books` where `session_id=eq.{sessionId}`
- **Session updates:** `UPDATE` on `sessions` where `id=eq.{sessionId}`
- **Chapter progress:** `UPDATE` on `chapters` where `session_id=eq.{sessionId}`

---

# 13. AUTHENTICATION FLOW

## Overview
Email OTP (passwordless) via Supabase Auth. No passwords stored.

## Detailed Flow

```mermaid
sequenceDiagram
    participant U as User
    participant App as Mobile App
    participant Store as Zustand Auth Store
    participant SB as Supabase Auth

    Note over App: App launches → initialize()
    Store->>SB: getSession()
    SB-->>Store: null (no active session)
    Store->>Store: AsyncStorage.getItem("kahoma_onboarded")
    Store->>Store: set initialized=true, onboarded=false/true

    Note over App: _layout.tsx navigation guard
    App->>App: No user → redirect to /auth/email

    U->>App: Enters email → taps "Send me a code"
    App->>Store: sendOTP(email)
    Store->>SB: signInWithOtp({ email })
    SB-->>Store: Success (OTP sent via email)
    App->>App: Navigate to /auth/verify

    U->>App: Enters 6-digit code
    App->>Store: verifyOTP(email, token)
    Store->>SB: verifyOtp({ email, token, type: 'email' })
    SB-->>Store: Session + User object
    Store->>Store: onAuthStateChange fires → set user + session

    Note over App: _layout.tsx detects user
    App->>App: User exists + not onboarded → /onboarding
    App->>App: User exists + onboarded → /(tabs)
```

## Key Configuration (Supabase Auth)
| Setting | Value |
|---------|-------|
| `mailer_autoconfirm` | `true` (skip email confirmation, send OTP directly) |
| `site_url` | `kahoma://` |
| `mailer_otp_length` | `6` |
| `mailer_otp_exp` | `3600` (60 minutes) |
| Token refresh | Automatic (`autoRefreshToken: true`) |
| Session storage | `AsyncStorage` |
| Detect session in URL | `false` (mobile — no URL to parse) |

## Auth Guard (`_layout.tsx`)
```
if (!user && !inAuthGroup) → redirect to /auth/email
if (user && !onboarded && !inOnboarding) → redirect to /onboarding
if (user && onboarded && (inAuth || inOnboarding)) → redirect to /(tabs)
```

---

# 14. ENVIRONMENT & SETUP

## Environment Variables

### `.env.local` (Mobile App)
```
EXPO_PUBLIC_SUPABASE_URL=https://bgyvfktnjzqhgrradvhh.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJneXZma3RuanpxaGdycmFkdmhoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM1NzM4NjEsImV4cCI6MjA4OTE0OTg2MX0.YyFmIC0VgAG2cw-mBghguNuHLGK38QNa3GI9l10wTQE
```

### Supabase Secrets (Edge Functions)
Set via `npx supabase secrets set KEY=VALUE`:
```
MOCK_MODE=true                    # Toggle mock/real AI
SUPABASE_URL=...                  # Auto-injected by Supabase
SUPABASE_SERVICE_ROLE_KEY=...     # Auto-injected by Supabase
OPENAI_API_KEY=...                # For Whisper (real mode)
ANTHROPIC_API_KEY=...             # For Claude (real mode)
REPLICATE_API_KEY=...             # For image generation (real mode)
PDFSHIFT_API_KEY=...              # For PDF rendering (real mode)
```

### Supabase Service Role Key (For Admin/Testing)
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJneXZma3RuanpxaGdycmFkdmhoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MzU3Mzg2MSwiZXhwIjoyMDg5MTQ5ODYxfQ.B7uq9xEG9RVh2IUEAfFh3uR3NaQHURUhvl8xuTbAdyY
```

### Supabase Access Token (CLI)
```
sbp_2ebdd1303cb87948fd093950c440cf9071ee54da
```

## How to Run Locally

### Prerequisites
1. Node.js 18+ installed
2. Android Studio + Android SDK (path: `C:\Users\LENOVO\AppData\Local\Android\Sdk`)
3. Supabase CLI v2.89.1+ (`npm install -g supabase`)
4. Physical Android device or emulator

### Steps
```bash
# 1. Clone repo
git clone https://github.com/sunnyrajendraraj/kahomaa.git
cd Kahoma

# 2. Install dependencies
npm install --legacy-peer-deps

# 3. Create .env.local (copy the values above)

# 4. Start Expo dev server
npx expo start

# 5. Scan QR code with Expo Go (for development)
# OR build APK (for production testing)
```

### Build Android APK
```bash
# Ensure android/ folder exists
npx expo prebuild --platform android

# Create local.properties (Windows)
echo sdk.dir=C:\\Users\\LENOVO\\AppData\\Local\\Android\\Sdk > android/local.properties

# Build release APK
cd android
set ANDROID_HOME=C:\Users\LENOVO\AppData\Local\Android\Sdk
.\gradlew.bat assembleRelease

# APK location:
# android/app/build/outputs/apk/release/app-release.apk
```

### Deploy Edge Functions
```bash
# Link to Supabase project
npx supabase link --project-ref bgyvfktnjzqhgrradvhh

# Set secrets
npx supabase secrets set MOCK_MODE=true

# Deploy all functions
npx supabase functions deploy transcribe-chunk
npx supabase functions deploy process-chunk
npx supabase functions deploy run-s-agent
npx supabase functions deploy run-e-agent
npx supabase functions deploy run-evaluator
npx supabase functions deploy run-clarification
npx supabase functions deploy generate-book
npx supabase functions deploy run-breaker
npx supabase functions deploy run-proxy-writer
npx supabase functions deploy run-picasso
npx supabase functions deploy run-binder
```

### Run Database Migration
1. Open Supabase Dashboard → SQL Editor
2. Paste contents of `supabase/migrations/001_initial.sql`
3. Execute

### Create Storage Buckets
In Supabase Dashboard → Storage:
1. Create bucket `audio` (private, 200MB max)
2. Create bucket `photos` (private, 20MB max)
3. Create bucket `books` (private, 50MB max)

---

# 15. DESIGN SYSTEM / UI LOGIC

## Color Palette
| Token | Hex | Usage |
|-------|-----|-------|
| Background | `#050508` | App background (near-black) |
| Card Background | `#0F0D0A` | Cards, session items |
| Amber (Primary) | `#C9933A` | Buttons, icons, accents, brand |
| Cream (Text) | `#F5EDD8` | Primary text color |
| Muted Brown | `#6b5c4e` | Secondary text, placeholders |
| Muted Sepia | `#8a7a6a` | Borders, ornaments |
| Red (Danger) | `#D4443B` | Recording active, delete, errors |
| Blue (Info) | `#7B9FCC` | Book generating status |
| Green (Success) | `#5C9E5C` | Book ready status |

## Typography
| Context | Size | Weight | Font |
|---------|------|--------|------|
| Brand name | 42px | 700 | Georgia/serif |
| Screen headings | 28-34px | 700 | Georgia/serif |
| Body text | 15-16px | 400 | System |
| Buttons | 16px | 700 | System |
| Labels | 11-12px | 500 | System, uppercase |
| Timer | 16px | 600 | tabular-nums |

## Styling Approach
- **No styling library** — pure React Native `StyleSheet.create()`
- **No theme provider** — colors hardcoded in each component
- **Dark mode only** — no light theme
- **Platform-specific font:** `fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif'`
- **Consistent border radius:** 12px for cards/buttons, 16px for chat bubbles
- **Shadows:** Amber glow on FAB and record button, subtle on book cover

## Book PDF Typography (Binder)
- **Font:** Cormorant Garamond (loaded from Google Fonts CDN)
- **Page size:** 148mm × 210mm (A5)
- **Margins:** 22mm top, 18mm right, 20mm bottom, 22mm left
- **Chapter titles:** 32px, small-caps, amber color
- **Body text:** 14px, 1.8 line-height, justified
- **Drop cap:** First letter of each chapter, 4-line height, amber

---

# 16. KEY BUSINESS LOGIC

## The 6-Agent AI Architecture

Kahoma's core innovation is a **multi-agent pipeline** where each agent has a specific role:

### Phase 1 Agents (Understanding)
| Agent | Role | Analogy |
|-------|------|---------|
| **S-Agent** (Sentiment) | Analyzes emotional tone, predicts story direction | The empathetic listener |
| **E-Agent** (Entity) | Extracts characters, places, events, relationships | The historian |
| **Evaluator** | Scores comprehension, decides ask/acknowledge | The quality gatekeeer |
| **Clarification** | Generates warm human-like responses | The interviewer |

### Phase 2 Agents (Generation)
| Agent | Role | Analogy |
|-------|------|---------|
| **Breaker** | Structures story into chapters (emotional, not chronological) | The editor |
| **ProxyWriter** | Writes literary prose from transcripts | The ghostwriter |
| **Picasso** | Generates era-appropriate images | The illustrator |
| **Binder** | Assembles PDF with typography and layout | The publisher |

## The "Bible" Concept
The Bible is the accumulated knowledge from Phase 1 that Phase 2 agents use:
```
Bible = Sentiment Store + Entity Store + Context Window (all messages)
```
It's assembled by `bibleService.ts` and contains everything the agents have learned about the user's story.

## Evaluator Scoring System
The Evaluator scores understanding on 5 dimensions (total = 100):
| Dimension | Max Score |
|-----------|-----------|
| Entity completeness | 25 |
| Relationship clarity | 20 |
| Sentiment confidence | 20 |
| Perspective accuracy | 20 |
| Story coherence | 15 |

- Score ≥ 80 → **Acknowledge** (encourage user to continue / tell more)
- Score < 80 → **Ask** (one specific clarifying question)

## Narrator Perspective Preservation
A core design principle: the E-Agent and ProxyWriter prioritize the **narrator's subjective perspective** over objective reality. If the user says "my grandmother was the strongest woman alive," the AI accepts that framing — it doesn't fact-check or neutralize emotional language.

## MOCK_MODE
Every edge function checks `Deno.env.get("MOCK_MODE") === "true"`. In mock mode:
- No API calls are made (zero cost)
- Pre-written realistic Indian memoir data is returned
- Mock data features: Dadi Savitri, Lucknow haveli, Papa's harmonium, train to Bombay
- Evaluator alternates between ask/acknowledge based on message count
- Picasso skips image generation entirely
- Binder outputs HTML instead of PDF

---

# 17. DEPENDENCIES

## Runtime Dependencies

| Package | Version | Why |
|---------|---------|-----|
| `expo` | ~54.0.33 | Framework for React Native development |
| `react` | 19.1.0 | UI library |
| `react-native` | 0.81.5 | Native mobile framework |
| `expo-router` | ~6.0.23 | File-based routing with deep linking |
| `@supabase/supabase-js` | ^2.103.0 | Supabase client for auth, DB, storage, functions, realtime |
| `zustand` | ^5.0.12 | Minimal state management (2 stores) |
| `expo-av` | ~16.0.8 | Audio recording with metering |
| `expo-file-system` | ~19.0.21 | File download/read for book sharing |
| `expo-image-picker` | ~17.0.10 | Pick photos for character upload |
| `expo-sharing` | ~14.0.8 | Native share sheet for books |
| `expo-linking` | ~8.0.11 | Open URLs (read book in browser) |
| `expo-media-library` | ~18.2.1 | Save files to device |
| `expo-status-bar` | ~3.0.9 | Status bar config (light mode) |
| `expo-constants` | ~18.0.13 | Access app constants |
| `expo-dev-client` | ~6.0.20 | Development builds |
| `@react-native-async-storage/async-storage` | 2.2.0 | Persist auth tokens + onboarding flag |
| `react-native-url-polyfill` | ^3.0.0 | URL API polyfill needed by Supabase |
| `react-native-gesture-handler` | ~2.28.0 | Required by expo-router / react-navigation |
| `react-native-safe-area-context` | ~5.6.0 | Safe area insets |
| `react-native-screens` | ~4.16.0 | Native screen containers |
| `@expo/vector-icons` | ^15.0.3 | Ionicons icon library |

## Dev Dependencies

| Package | Version | Why |
|---------|---------|-----|
| `typescript` | ~5.9.2 | Type checking |
| `@types/react` | ~19.1.0 | React type declarations |

## External API Dependencies (Edge Functions)
| API | Pricing | Free Tier |
|-----|---------|-----------|
| OpenAI Whisper | $0.006/min | Pay-per-use only |
| Anthropic Claude Sonnet 4.5 | $3/$15 per Mt/Mo | Pay-per-use only |
| Replicate (SDXL) | ~$0.003/image | Some free credits for new accounts |
| PDFShift | $9/mo starter (250 conversions) | 50 free conversions |

---

# 18. LIMITATIONS & RISKS

## Current Bottlenecks
1. **Supabase Free Tier Limits:**
   - 50MB database (fills fast with JSONB columns)
   - 1GB storage (audio files are large: ~1MB/min)
   - 500K edge function invocations/month
   - 2 million realtime messages/month

2. **APK Size (96.6 MB):** Includes all Expo modules; needs tree-shaking or EAS Build

3. **Sequential Chapter Writing:** Chapters are written one-by-one (not parallelized) to maintain coherence; slow for many chapters

4. **No Error Recovery UI:** If a chunk fails processing, user has no way to retry from the app

5. **Single-session at a time:** While technically multiple sessions are supported, the UI doesn't indicate which session is actively processing

## Scalability Concerns
- Each recording session creates ~5 edge function invocations per chunk
- A 30-minute story (3 chunks × 10 min) = ~15 function calls just for Phase 1
- Book generation = ~8-15 function calls depending on chapter count
- At scale: need paid Supabase plan or self-hosted Supabase

## Technical Debt
1. **Hardcoded colors** — no theme system; changing branding requires touching every file
2. **No error boundary** — React errors crash the app
3. **No analytics** — no telemetry, no crash reporting
4. **No tests** — zero unit/integration/e2e tests
5. **Debug APK signing** — can't publish to Play Store
6. **No i18n** — UI is English only (though transcription handles Hindi)
7. **`expo-file-system/legacy`** import — workaround for SDK 54 changes; may break in future
8. **Edge function auth** — functions use service_role key from environment; not verifying user JWT
9. **No rate limiting** — user can spam record button and generate excessive API calls

## Security Considerations
- Service role key is in edge functions (correct — server-side)
- Anon key is in client `.env.local` (correct — public key)
- RLS policies protect user data separation
- Audio/photos/books storage uses signed URLs (time-limited access)
- **Risk:** Processing log table has no RLS (contains session IDs)

---

# 19. FUTURE ROADMAP

## Near-term (v1.1)
- [ ] Switch from MOCK_MODE to real AI APIs
- [ ] Proper APK signing for Play Store
- [ ] Push notifications for book readiness
- [ ] Error retry UI on session screen
- [ ] Session title editing
- [ ] Delete session functionality

## Medium-term (v2.0)
- [ ] iOS build and App Store submission
- [ ] Payment system (Stripe/Razorpay)
- [ ] Book revision/editing flow
- [ ] Multiple story voices (interview mode: 2 people)
- [ ] Video recording option
- [ ] Social sharing with preview cards
- [ ] Admin dashboard for monitoring
- [ ] Analytics (Mixpanel/Amplitude)
- [ ] Crash reporting (Sentry)

## Long-term (v3.0)
- [ ] Multi-language UI (Hindi, Tamil, Bengali, etc.)
- [ ] Physical book printing integration (Blurb/Lulu)
- [ ] Family tree visualization from entities
- [ ] Audio book generation (TTS)
- [ ] Collaborative memoirs (family contributes)
- [ ] AI-generated cover art
- [ ] Book marketplace / public archive

## Technical Improvements
- [ ] EAS Build for smaller APKs
- [ ] Theme system (design tokens)
- [ ] Error boundaries
- [ ] Unit tests + integration tests
- [ ] E2E tests (Detox or Maestro)
- [ ] CI/CD pipeline (GitHub Actions)
- [ ] Self-hosted Supabase for cost control
- [ ] Edge function JWT verification
- [ ] Rate limiting on API endpoints

---

# 20. MIGRATION INSTRUCTIONS (CRITICAL)

## Migrating to a New Supabase Project

### What Must Be Preserved
1. Database schema (run `001_initial.sql`)
2. Storage buckets (audio, photos, books) with RLS policies
3. Edge functions (all 11)
4. Auth settings (email OTP, autoconfirm, OTP length)
5. Environment variables / secrets

### Step-by-Step
```bash
# 1. Create new Supabase project
# 2. Run migration:
#    Copy supabase/migrations/001_initial.sql → SQL Editor → Execute

# 3. Create storage buckets in Dashboard:
#    audio (private, 200MB), photos (private, 20MB), books (private, 50MB)

# 4. Link CLI to new project:
npx supabase link --project-ref NEW_PROJECT_REF

# 5. Set secrets:
npx supabase secrets set MOCK_MODE=true
npx supabase secrets set OPENAI_API_KEY=xxx
npx supabase secrets set ANTHROPIC_API_KEY=xxx
npx supabase secrets set REPLICATE_API_KEY=xxx
npx supabase secrets set PDFSHIFT_API_KEY=xxx

# 6. Deploy all functions:
npx supabase functions deploy transcribe-chunk
npx supabase functions deploy process-chunk
npx supabase functions deploy run-s-agent
npx supabase functions deploy run-e-agent
npx supabase functions deploy run-evaluator
npx supabase functions deploy run-clarification
npx supabase functions deploy generate-book
npx supabase functions deploy run-breaker
npx supabase functions deploy run-proxy-writer
npx supabase functions deploy run-picasso
npx supabase functions deploy run-binder

# 7. Update .env.local with new project URL + anon key:
EXPO_PUBLIC_SUPABASE_URL=https://NEW_REF.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=new_anon_key

# 8. Configure auth in Dashboard:
#    Authentication → URL Configuration:
#      Site URL: kahoma://
#    Authentication → Email Templates → Magic Link:
#      Use OTP code template
#    Authentication → Email:
#      Enable OTP, length=6, autoconfirm=true

# 9. Rebuild APK
npx expo prebuild --platform android --clean
cd android && .\gradlew.bat assembleRelease
```

### What Can Break
- **Auth tokens invalid** — users must re-login after Supabase project change
- **Storage paths** — old bucket URLs won't work on new project
- **Realtime subscriptions** — must match new project URL
- **Edge function URLs** — change with project ref
- **User data** — not migrated (fresh start)

## Migrating Frontend to Different Framework
The backend (Supabase) is framework-agnostic. To port the frontend:
1. Keep all edge functions as-is
2. Re-implement the Supabase client with the new framework's HTTP/WS client
3. Re-implement audio recording with platform-specific APIs
4. Re-implement real-time subscriptions
5. All API contracts (function inputs/outputs) remain the same

## Migrating Backend Off Supabase
If moving away from Supabase entirely:
1. **Database:** Export PostgreSQL schema + migrate to any Postgres host
2. **Auth:** Implement email OTP using a service like Auth0, Firebase Auth, or custom
3. **Storage:** Use S3/GCS/Cloudflare R2 — update storage paths in functions
4. **Edge Functions:** Port Deno functions to Node.js (AWS Lambda, Cloudflare Workers)
5. **Realtime:** Use WebSockets (Socket.io, Pusher, or Ably)
6. **Key change:** Replace `createClient(url, key)` with direct API calls

---

# 21. TL;DR FOR NEW AI AGENT

## What Is This?
**Kahoma** is a mobile app (React Native/Expo) that lets users speak their life stories and generates a published memoir book using a multi-agent AI pipeline. Built on Supabase (PostgreSQL + Edge Functions + Storage + Auth + Realtime).

## How It Works
1. User opens app → email OTP login → 3-slide onboarding
2. User records voice (up to 10 min chunks) → uploaded to Supabase Storage
3. **Phase 1 pipeline** (per chunk): Transcribe → Sentiment + Entity analysis in parallel → Evaluate understanding → Generate warm response with optional clarifying question
4. User repeats recording until story is complete
5. User taps "That's my story" → **Phase 2 pipeline**: Structure into chapters → Write literary prose per chapter → Generate images → Assemble PDF book
6. User downloads/shares their published memoir

## Where To Start
1. **Understand the flow:** `src/app/_layout.tsx` → auth guard → `session/[id].tsx` → `book/[id].tsx`
2. **Understand the backend:** `supabase/functions/process-chunk/index.ts` (Phase 1 orchestrator) and `supabase/functions/generate-book/index.ts` (Phase 2 orchestrator)
3. **Database:** `supabase/migrations/001_initial.sql` — complete schema
4. **Types:** `src/types/index.ts` — all data interfaces
5. **State:** `src/store/auth.ts` and `src/store/sessions.ts`
6. **Services:** `src/lib/uploadService.ts` — main data operations

## Key Commands
```bash
# Start dev server
npx expo start

# Build APK
cd android && .\gradlew.bat assembleRelease

# Deploy a function
npx supabase functions deploy FUNCTION_NAME

# Toggle real AI
npx supabase secrets set MOCK_MODE=false

# Set real API keys
npx supabase secrets set OPENAI_API_KEY=sk-xxx
npx supabase secrets set ANTHROPIC_API_KEY=sk-ant-xxx
npx supabase secrets set REPLICATE_API_KEY=r8_xxx
npx supabase secrets set PDFSHIFT_API_KEY=xxx
```

## Currently in MOCK_MODE
All 11 edge functions return realistic pre-written Indian memoir data (Dadi Savitri, Lucknow haveli, Papa's harmonium). Zero API costs. Set `MOCK_MODE=false` and provide real API keys to enable actual AI processing.

---

*End of Knowledge Transfer Document*
