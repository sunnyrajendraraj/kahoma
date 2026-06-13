# Kahoma — Complete System Architecture & Engineering Documentation

> **Named after Kahoma** — A voice-first memoir creation platform that transforms spoken life stories into publication-ready books.
> 
> This document serves as the primary system architecture guide, design specification, and technical reference for developers and engineers onboarding onto the Kahoma project.

---

## 1. Project Vision

### What Kahoma Is
Kahoma is a voice-first memoir creation platform. It allows users to tell their life stories in their own words, capturing raw voice recordings and translating them through a multi-agent AI pipeline into structured, literary-quality memoirs complete with chapters, era-transformed images, and printable formatting.

### Why It Exists
Every life holds a story worth telling, but the vast majority of people will never write a book. The barrier is too high: writing is time-consuming, requires discipline and literary skill, and hiring a professional ghostwriter costs between $10,000 and $100,000+. Kahoma solves this by turning speaking into publishing, making memoir creation accessible to everyone.

### Problems Solved
*   **The Blank Page Problem:** Narration is natural; writing is hard. By using voice as the primary input, users simply talk.
*   **Conversational Guidance:** Raw transcripts are often unstructured or repetitive. Kahoma's AI analyzes inputs in real-time, scores understanding, and asks gentle clarifying questions to fill narrative gaps.
*   **Coherence and Polish:** Translates spoken, sometimes fragmented speech into structured, high-quality literary prose in first-person perspective.
*   **Asset Creation:** Generates era-appropriate illustrations and compiles everything into a print-ready PDF using book-quality typography.

### Target Users
*   **Families (Primary Market):** Preserving stories of parents, grandparents, and family elders.
*   **Elderly Individuals:** Who prefer speaking over typing and want a simple, unhurried conversation interface.
*   **First-Generation Immigrants:** Wishing to document their journey and cultural heritage for future generations.

---

## 2. High-Level System Architecture

Kahoma is built on a modern, decoupled client-server architecture designed for high availability, security, and fast background processing.

```
┌──────────────────────────────────────────────────────────────┐
│                    CLIENT LAYER (Next.js)                    │
│                                                              │
│  - Records audio via Web Audio API & MediaRecorder           │
│  - Streamlines Auth via Supabase Email OTP                   │
│  - Subscribes to Supabase Realtime for instant updates       │
└────────────────────────┬─────────────────────────────────────┘
                         │ HTTPS + JWT Token
                         ▼
┌──────────────────────────────────────────────────────────────┐
│                     API LAYER (FastAPI)                      │
│                                                              │
│  - Standardized asynchronous REST endpoints                  │
│  - Bypasses RLS utilizing Service Role, manages rules in code│
│  - Dispatches background tasks for chunk & book generation  │
└────────────────────────┬─────────────────────────────────────┘
                         │ Calls
                         ▼
┌──────────────────────────────────────────────────────────────┐
│                    SERVICE LAYER (Python)                    │
│                                                              │
│  - Transcription, Agent pipeline orchestration               │
│  - Implements tenacity retries & caching utilities           │
│  - Integrates 6 AI agents using Gemini 2.0 Flash             │
└────────────────────────┬─────────────────────────────────────┘
                         │ Queries
                         ▼
┌──────────────────────────────────────────────────────────────┐
│                  DATABASE LAYER (Supabase)                   │
│                                                              │
│  - PostgreSQL database with tables for sessions, messages,   │
│    chapters, books, and processing logs                      │
└──────────────────────────────────────────────────────────────┘
```

### End-to-End Workflow & Request Lifecycle

#### Phase 1: Interactive Storytelling (Incremental Processing)
1.  **Audio Capture:** The Next.js client records a story fragment (up to 10 minutes) using `MediaRecorder`.
2.  **Upload:** The client uploads the raw audio to the `/api/v1/chunks/upload` endpoint with a session ID.
3.  **Acknowledge:** FastAPI immediately saves the chunk to Supabase Storage and returns a `202 Accepted` response.
4.  **Transcription (Background):** A background task triggers `transcribe_chunk`. It fetches the audio, calls OpenAI Whisper (`whisper-1`), saves the text transcript, and inserts a `user` role message into `context_messages`.
5.  **Multi-Agent Evaluation (Background):** Once transcribed, the background task triggers `process_chunk`:
    *   **S-Agent** (Sentiment) and **E-Agent** (Entity Extraction) run in parallel using `asyncio.gather`.
    *   Results are written to `sentiment_store` and `entity_store`.
    *   **Evaluator Agent** reviews the accumulated story state and assigns a score (0-100) across 5 dimensions.
    *   **Clarification Agent** determines the response: if the score is $< 80$, it rephrases a clarification question; if $\ge 80$, it generates a warm acknowledgement inviting continuation.
    *   The generated reply is saved to `context_messages` and marked `awaiting_user`.
6.  **Real-Time Update:** The Next.js client, subscribed to `context_messages` via Supabase Realtime, renders the assistant's reply instantly.

#### Phase 2: Memoir Publication (Book Generation)
1.  **Trigger:** The user completes their storytelling and taps "That's my story" (`POST /api/v1/sessions/{id}/generate-book`).
2.  **Acknowledge:** FastAPI sets status to `generating_book` and returns a `202 Accepted` response.
3.  **Chapter Structuring (Background):** `generate_book` service runs **Breaker Agent** which compiles the "Story Bible" (transcript + sentiment + entities) and structures it into chapters.
4.  **Prose Generation (Background):** Runs **Proxy Writer** sequentially for each chapter. It drafts a 400-700 word narrative in the author's voice.
5.  **Illustration (Background):** **Picasso Agent** generates era-appropriate illustrations for each chapter using Replicate SDXL.
6.  **Assembly (Background):** **Binder Agent** compiles chapters, metadata, illustrations, Table of Contents, and colophon into a book-quality HTML format with *Cormorant Garamond* typography, saves it, updates the book record to `ready`, and sets the session status to `book_ready`.
7.  **Reveal:** Client detects the status update and renders the book cover and download links.

---

## 3. Agent Architecture

Kahoma utilizes a specialized 8-agent pipeline where each agent operates with a specific scope, system prompt, and output schema.

### 1. S-Agent (Sentiment Analysis)
*   **Purpose:** Extracts the narrator's emotional landscape, tone, and predicted story direction.
*   **Inputs:** Historical context messages (transcripts + assistant prompts) from `context_messages`.
*   **Outputs:** `SentimentResult` Pydantic model.
*   **System Prompt:**
    ```text
    You are the Sentiment Analysis Agent for Kahoma, a memoir platform.
    Analyze the narrator's full transcript and extract the emotional landscape.
    The narrator is the supreme authority on their own story. Never judge. Always understand.
    ```
*   **Responsibilities:** Extracts primary sentiment, tonality nuances, political/social context, predicted future topics, confidence, and key emotional moments.
*   **Interactions:** Stores output in `sentiment_store` which is consumed by the Evaluator and Breaker.

### 2. E-Agent (Entity Extraction)
*   **Purpose:** Identifies characters, locations, events, and relationships from the narrator's perspective.
*   **Inputs:** Full `context_messages` + existing entities (for enrichment).
*   **Outputs:** `EntityExtractionResult` Pydantic model.
*   **System Prompt:**
    ```text
    You are the Entity Extraction Agent for Kahoma.
    Extract ALL entities and capture THE NARRATOR'S PERSPECTIVE on each — not objective reality.
    A grandmother can be loving OR cruel. A success can feel like failure.
    Always capture what entities MEAN to THIS narrator.
    Merge with existing entities — enrich, never duplicate.
    ```
*   **Responsibilities:** Extracts entities (characters, places, events, objects) along with their emotional charge, relationships, and newly identified characters.
*   **Interactions:** Stores results in `entity_store` and inserts new records into the `characters` table.

### 3. Evaluator Agent
*   **Purpose:** Scores the AI's understanding of the story across 5 dimensions.
*   **Inputs:** Transcripts, S-Agent outputs, and E-Agent outputs.
*   **Outputs:** `EvaluatorResult` Pydantic model.
*   **System Prompt:**
    ```text
    You are the Evaluator Agent for Kahoma.
    Score story understanding 0-100:
    - Entity completeness: 25pts
    - Relationship clarity: 20pts
    - Sentiment confidence: 20pts
    - Perspective accuracy: 20pts
    - Story coherence: 15pts
    Threshold: 80. Below 80 = ask ONE specific question. Above 80 = acknowledge.
    If a key character's identity is ambiguous in a story-changing way: always ask regardless of score.
    ```
*   **Responsibilities:** Evaluates entity completeness, relationship clarity, sentiment confidence, perspective accuracy, and story coherence. Decides whether to ask a question or acknowledge, identifying the specific gap.
*   **Interactions:** Feeds results to the Clarification Agent.

### 4. Clarification Agent
*   **Purpose:** Generates warm, conversational replies based on the Evaluator's score.
*   **Inputs:** Session context + Evaluator output.
*   **Outputs:** Conversational text response.
*   **System Prompt:**
    ```text
    You are Kahoma's story companion. Warm, patient, genuinely interested.
    Acknowledgements: max 2 sentences. Questions: max 1 sentence.
    Never clinical. Never formal. Speak like a caring friend.
    Good acknowledgement: "That's a remarkable memory. Please continue."
    Good question: "Just to hold the story clearly — he's your father, yes?"
    If requesting a photo: explain warmly how it will help bring the story to life. Make clear it's optional. Max 2 sentences.
    ```
*   **Responsibilities:** Formulates warm, conversational acknowledgements, clarifies ambiguous relationships, and requests photos for new characters.
*   **Interactions:** Inserts response into `context_messages` and updates session status to `awaiting_user`.

### 5. Breaker Agent
*   **Purpose:** Structures the compiled story into a set of chapters.
*   **Inputs:** Compiled Story Bible (sentiment, entities, relationships, transcripts).
*   **Outputs:** `BreakerResult` Pydantic model.
*   **System Prompt:**
    ```text
    You are the Breaker Agent. Think like India's greatest storytellers:
    Premchand, Amrita Pritam, Dharmveer Bharati.
    You receive the full Bible (sentiment + entities + transcript).
    Divide the story into optimal chapters — NOT necessarily chronological.
    Find the order that creates the most emotionally resonant book.
    ```
*   **Responsibilities:** Generates book title, subtitle, narrative structure style, and detailed chapter metadata (titles, eras, settings, central figures, emotional arcs, relevant transcript excerpts, and image concepts).
*   **Interactions:** Inserts chapter records and initializes a book record in Supabase.

### 6. Proxy Writer Agent
*   **Purpose:** Writes high-quality prose for individual chapters based on outlines and transcripts.
*   **Inputs:** Chapter title, era, setting, characters, emotional arc, story sentiments, and raw transcript segments.
*   **Outputs:** Narrative text.
*   **System Prompt:**
    ```text
    You are the Proxy Writer — a literary author with 40 years experience.
    RULES:
    1. PRESERVE THE NARRATOR'S PERSPECTIVE ABSOLUTELY.
       If they say someone was cruel — they are cruel in your prose.
    2. First person unless narrator told story in third person.
    3. Vivid sensory details. Reconstruct what the air smelled like.
    4. Show, don't tell.
    5. 400-700 words. Flowing prose. No bullet points.
    6. Open with a specific sensory moment. Close with quiet resonance.
    7. Use Hindi terms naturally where appropriate.
    8. DO NOT sanitize. DO NOT add false hope. DO NOT change what narrator felt.
    ```
*   **Responsibilities:** Generates high-quality narrative text, respecting cultural background and tone.
*   **Interactions:** Updates chapter record with `content_written` and sets status to `written`.

### 7. Picasso Agent
*   **Purpose:** Generates era-appropriate illustrations for chapters using Replicate SDXL.
*   **Inputs:** Chapter eras, settings, image concepts, character descriptions, and character photos (if uploaded).
*   **Outputs:** Illustration image URLs.
*   **Workflow:**
    *   *Workflow A (Era-transform):* If a character has a user-uploaded photo, creates a signed URL and runs an img2img task transforming the photo into a specific vintage era (e.g., 1960s Lucknow).
    *   *Workflow B (Illustration):* If no photo exists, generates a text-to-image illustration based on the chapter's `image_prompt`.
*   **Interactions:** Uploads generated images to Supabase storage and updates `chapters.image_url`.

### 8. Binder Agent
*   **Purpose:** Assembles chapters, TOC, cover, and colophon into a book.
*   **Inputs:** Book cover title, author name (resolved from Supabase user profile), chapters, and chapter image URLs.
*   **Outputs:** Final book HTML/PDF.
*   **Responsibilities:** Generates Roman numerals for chapters, structures HTML with custom CSS (size A5, Cormorant Garamond font, drop caps, justified text), uploads file, and updates book status to `ready`.
*   **Interactions:** Updates book record with `pdf_url` and page count, and updates session status to `book_ready`.

---

## 4. Multi-Agent Workflow Coordination

```
=== PHASE 1: STORYTELLING ===
User Uploads Audio ──► transcribe_chunk ──► process_chunk
                                                │
                              ┌─────────────────┴─────────────────┐
                              ▼                                   ▼
                         run_s_agent                         run_e_agent
                              │                                   │
                              └─────────────────┬─────────────────┘
                                                ▼
                                          run_evaluator
                                                │
                                                ▼
                                        run_clarification
                                                │
                                                ▼
                                          Awaiting User


=== PHASE 2: BOOK GENERATION ===
User Taps "Publish" ──► run_breaker ──► run_proxy_writer (sequential per chapter)
                                                  │
                                                  ▼
                                             run_picasso
                                                  │
                                                  ▼
                                              run_binder ──► Book Ready (HTML/PDF)
```

### Context Passing & State Transitions
*   **Phase 1 State:** State transitions move from `recording` $\rightarrow$ `processing_chunk` $\rightarrow$ `awaiting_user`. Messages are stored incrementally in `context_messages`.
*   **Phase 2 State:** State transitions move from `awaiting_user` $\rightarrow$ `generating_book` $\rightarrow$ `book_ready` (or `failed`). The Breaker agent compiles the entire session history into a "Story Bible" context, which is then divided into database records inside the `chapters` table. Individual chapters are updated independently by the Proxy Writer.

### Failure Handling & Resilience
1.  **Network/Rate Limit Failures:** All Gemini API interactions are wrapped with `tenacity` exponential backoff retries. If a rate limit (`429`) or server error (`503`) occurs, the client retries up to 3 times, waiting up to 10 seconds.
2.  **Orchestrator Fallbacks:** In `process_chunk`, S-Agent, E-Agent, and Evaluator are wrapped in safety bounds. If they fail, the pipeline falls back to a default `acknowledge` decision. If the Clarification Agent itself fails, a default message (*"Thank you for sharing that. I'm listening closely — please continue whenever you're ready."*) is injected directly, and the session is reset to `awaiting_user` to prevent deadlocks.
3.  **Picasso Failure:** If Replicate fails or keys are missing, the Picasso agent logs the error but continues, allowing the Binder to compile the book without images gracefully.

---

## 5. Directory & File Structure

```
g:/kahoma/
├── .github/
│   └── workflows/
│       └── deploy.yml          # GitHub Actions CI/CD Pipeline
├── backend/                    # Python/FastAPI Backend
│   ├── agents/                 # Multi-Agent implementations
│   │   ├── binder.py           # Book compiler
│   │   ├── breaker.py          # Chapter partitioner
│   │   ├── clarification.py    # Companion responder
│   │   ├── e_agent.py          # Entity extractor
│   │   ├── evaluator.py        # Understanding scorer
│   │   ├── picasso.py          # Image generator
│   │   ├── proxy_writer.py     # Literary prose writer
│   │   └── s_agent.py          # Sentiment analyzer
│   ├── api/v1/                 # FastAPI routes
│   │   ├── books.py            # Book routes
│   │   ├── chunks.py           # Chunk upload and background trigger
│   │   ├── deps.py             # Auth dependencies & token validation
│   │   ├── processing.py       # Core processing route
│   │   ├── router.py           # Router entry
│   │   └── sessions.py         # Session CRUD & trigger book gen
│   ├── core/                   # Core modules
│   │   ├── audit.py            # Event logger helper
│   │   ├── gemini_client.py    # Resilient Gemini wrapper
│   │   ├── llm_cache.py        # In-memory LLM response cache
│   │   └── supabase_client.py  # Supabase client initializer
│   ├── schemas/                # Pydantic models for REST endpoints
│   ├── tests/                  # Pytest test suite
│   │   ├── conftest.py         # Testing mocks & client setups
│   │   ├── test_agents.py      # LLM logic & cache tests
│   │   └── test_api.py         # Endpoint routes tests
│   ├── config.py               # Env configuration loader
│   ├── Dockerfile              # Backend containerization
│   ├── main.py                 # FastAPI application entrypoint
│   └── requirements.txt        # Backend dependencies
├── supabase/                   # Supabase Database Config
│   ├── migrations/             # SQL schema migrations
│   └── config.toml             # Local Supabase config
├── web/                        # Next.js Web App
│   ├── src/
│   │   ├── app/                # Next.js pages & styling
│   │   │   ├── auth/           # OTP Sign-in screens
│   │   │   ├── session/        # Live recording page
│   │   │   ├── book/           # Book reveal page
│   │   │   └── globals.css     # Global styles & layout tokens
│   │   ├── components/         # Reusable UI widgets
│   │   ├── hooks/              # Custom hooks (recording, realtime)
│   │   ├── lib/                # API helpers
│   │   ├── store/              # Zustand state stores
│   │   └── types/              # TypeScript interface definitions
│   └── package.json            # Node dependencies
```

### Core Backend Files
*   [main.py](file:///g:/kahoma/backend/main.py): Registers Lifespan events (eager client checks), CORS settings, global exception handlers, health probes, and routes.
*   [config.py](file:///g:/kahoma/backend/config.py): Settings schema loading `.env` properties, throwing validation errors if required parameters are missing.
*   [core/gemini_client.py](file:///g:/kahoma/backend/core/gemini_client.py): Unified client containing `tenacity` retry, caching checks, native structured schema integrations, and token/latency logging.
*   [core/llm_cache.py](file:///g:/kahoma/backend/core/llm_cache.py): ephemerally caches Gemini responses based on SHA-256 hashes of system prompt, user prompt, and target schemas.
*   [api/v1/deps.py](file:///g:/kahoma/backend/api/v1/deps.py): Implements user identity extraction and verification using Supabase stateless token decoding.
*   [tests/conftest.py](file:///g:/kahoma/backend/tests/conftest.py): Global mock client intercepting calls to Supabase and Gemini, enabling 100% offline, rapid testing.

---

## 6. Technical Stack

### Backend
*   **FastAPI:** Asynchronous Python web framework for routing.
*   **Uvicorn:** ASGI web server.
*   **Pydantic / Pydantic Settings:** Validation schemas and environment configuration.
*   **Tenacity:** Retry loops for API request resilience.

### AI / LLM
*   **Google GenAI SDK (Gemini 2.0 Flash):** Principal model used for multi-agent reasoning, classification, and text generation.
*   **OpenAI Whisper API (`whisper-1`):** Sub-second audio transcription.
*   **Replicate (SDXL / ControlNet):** Image illustration and era-based photo transformation.

### Database & Storage
*   **Supabase (PostgreSQL):** Relational database.
*   **Supabase Storage:** Private buckets for `audio` (chunks), `photos` (portraits), and `books` (HTML/PDF assets).
*   **Supabase Realtime:** Instant Postgres change broadcast to frontend clients.

### Frontend
*   **Next.js (App Router):** Modern React framework.
*   **Zustand:** Simple client state management.
*   **Web Audio API:** For real-time microphone recording and audio level analysis.

---

## 7. Engineering Decisions (ADRs)

### ADR-013: Native Pydantic Structured Outputs
*   **Decision:** Replaced prompt-based JSON formatting instructions and regex parsers with native Pydantic schema validation passed directly to Gemini's `response_schema` parameter.
*   **Rationale:** Parsing raw string outputs was fragile. Forcing the LLM to adhere to Pydantic definitions at the API layer ensures type safety, schema conformance, and prevents runtime parsing exceptions.
*   **Trade-off:** Slightly increases LLM initialization latency for schema compiling, but raises parsing reliability to 100%.

### ADR-014: In-Memory LLM Caching
*   **Decision:** Built an ephemeral cache layer (`llm_cache.py`) that stores responses based on SHA-256 hashes of system instructions, user inputs, and target schemas.
*   **Rationale:** Reduces development costs and pipeline latency when calling identical workflows during debugging or repeat evaluation loops.
*   **Trade-off:**ephemeral and resets on server reload. Redis should be used in production.

### ADR-015: Tenacity Exponential Backoff Retries
*   **Decision:** Wrapped LLM transactions with `tenacity` retry decorators configured with exponential wait backoff and random jitter.
*   **Rationale:** Cloud LLM endpoints are prone to rate limits (HTTP 429) or transient timeouts. Automatic retries ensure recovery without breaking user sessions.
*   **Trade-off:** Holds client connections open longer during outages, but provides a resilient experience.

---

## 8. Features

### Asynchronous Audio Processing
*   **Mechanism:** Users upload audio files; backend saves the metadata and returns `202 Accepted` immediately. Background tasks execute transcription and processing, ensuring the client request is non-blocking.

### Real-Time Chat Feed
*   **Mechanism:** The frontend connects to Supabase Realtime, subscribing to inserts on `context_messages`. When the background pipeline finishes, it inserts the assistant's reply, prompting an immediate UI render.

### PDF Book Compiler
*   **Mechanism:** Compiles chapter records, formatting drop caps on first letters, text justification, running headers, TOC, and title cards using CSS print styles.

---

## 9. Challenges & Solutions

### Challenge 1: LLM JSON Output Formatting Breaks
*   **Root Cause:** Models occasionally append markdown code blocks (````json ... ````) or return invalid trailing commas, crashing JSON parsers.
*   **Solution:** Built `parse_json_response` to strip markdown code blocks and identify outermost curly braces (`{ ... }`). Migrated agents to native Pydantic schemas using Gemini's `response_schema` SDK configuration.

### Challenge 2: Background Task Latency
*   **Root Cause:** Running S-Agent, E-Agent, Evaluator, and Clarification sequentially takes 8–15 seconds, degrading the interactive user experience.
*   **Solution:** Leveraged `asyncio.gather` to execute S-Agent and E-Agent in parallel, cutting chunk processing times by nearly 50%.

### Challenge 3: Supabase RLS and Server-Side Operations
*   **Root Cause:** In standard setups, Row-Level Security (RLS) restricts access based on authenticated user IDs. However, background services need to query and update multiple tables without context-bound client headers.
*   **Solution:** The FastAPI backend connects using Supabase's `service_role` key, bypassing database RLS restrictions. Tenant checks are handled explicitly within API routers to ensure data isolation.

---

## 10. Setup Guide

### Prerequisites
*   Python 3.12 (via py launcher)
*   Node.js v20+

### Environment Variables (`backend/.env`)
```ini
SUPABASE_URL=https://your-ref.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_JWT_SECRET=your-jwt-secret

GEMINI_API_KEY=your-gemini-key
OPENAI_API_KEY=your-openai-key
REPLICATE_API_KEY=your-replicate-key

MOCK_MODE=true # Toggle true for testing without API usage
```

### Running Locally

#### 1. Start Backend Server
```bash
cd backend
pip install -r requirements.txt
py main.py
# Server runs on http://localhost:8000
```

#### 2. Start Web Frontend
```bash
cd web
npm install
npm run dev
# App runs on http://localhost:3000
```

### Running Tests
Execute unit and integration tests from the backend directory:
```bash
cd backend
py -m pytest tests/ -v
```

---

## 11. Deployment Guide

### Build Process
1.  **Backend:** Containerized using the provided `Dockerfile`. Deployable to Vercel (using `vercel.json` config) or any Docker-compatible cloud platform (Render, Fly.io, ECS).
2.  **Frontend:** Built and compiled via `npm run build` and deployed to Vercel or Netlify.

### Monitoring & Observability
*   **Console Logging:** Standardized logging captures latency and token counts (prompt tokens, candidate tokens, total tokens) for every LLM transaction.
*   **Database Audit Trail:** Every major lifecycle event (transcription complete, agent errors, book generation start/finish) inserts a structured row into the `processing_log` table for auditing and diagnostics.

---

## 12. Future Improvements

*   **Redis Semantic Caching:** Migrate the in-memory LLM cache to Redis for persistent, distributed caching.
*   **Task Queues (Celery/ARQ):** Replace FastAPI's simple `BackgroundTasks` with a dedicated queue to handle larger scale uploads.
*   **OpenTelemetry Tracing:** Integrate tools like LangSmith or Phoenix for deep tracing and visual agent debugging.
*   **Self-Correction Loop:** Introduce an LLM-as-a-judge layer inside Evaluator to test generated prose against original transcripts to guarantee zero hallucinations.
