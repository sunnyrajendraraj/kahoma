# Technical Interview Preparation Guide & Project Defense Bible

This document is the **Project Defense Bible** for Kahoma. It prepares you to defend every architectural layer, database schema, agent design, API route, and line of code under intensive cross-examination by Principal AI, LLM, Backend, and ML Engineers.

---

## 1. Project Story: Elevators to Deep Dives

### The 30-Second Elevator Pitch
"Kahoma is a voice-first memoir creation platform that transforms raw spoken stories into publication-ready, fully typeset books. Rather than just transcribing voice-to-text, it runs an asynchronous, 6-agent AI pipeline (Sentiment Analysis, Entity Extraction, Evaluator, Companion, Chapter Breaker, and Proxy Writer) built on FastAPI and Supabase. It solves the blank page and formatting barriers by letting users simply talk, while the system handles contextual understanding, chapter division, photo transformations, and print-ready output generation."

### The 1-Minute Explanation
"Writing a memoir is hard, and hiring a ghostwriter costs up to $100,000. Kahoma makes memoir writing accessible by letting users speak naturally. Behind a warm Next.js front-end, a FastAPI backend orchestrates a multi-agent workflow. When a user uploads a voice chunk, the system transcribes it via Whisper and invokes parallel sentiment and entity extraction agents to build a dynamic story profile. An Evaluator Agent grades the AI's understanding out of 100. If the score is low, a Companion Agent asks a clarifying question; if high, it acknowledges warmly. When the user completes their sessions, a Chapter Breaker plans the layout, a Proxy Writer drafts 700-word prose chapters in the narrator's voice, Picasso generates era-appropriate illustrations, and Binder compiles the final book into a typeset, print-ready HTML/PDF format."

### The 3-Minute Explanation
"Kahoma is designed to showcase production-grade GenAI and Backend patterns rather than tutorial-level wrappers. On the backend, we use FastAPI for asynchronous request handling and JWT-based authentication. Audio chunks are uploaded directly to Supabase storage, and transcription is offloaded to background task workers. The core differentiator is our AI pipeline: S-Agent (Sentiment) and E-Agent (Entity) run in parallel via `asyncio.gather` for performance.
We solved typical LLM fragility by enforcing native Pydantic structured outputs at the API level using Gemini 2.0 Flash's `response_schema` configuration. To ensure resilience, we wrapped all API calls in a Tenacity exponential backoff loop with jitter, handling rate limits and timeouts automatically. To control token costs and accelerate testing, we implemented an in-memory LLM cache layer. The final publication is assembled using CSS print structures, rendering Table of Contents, running headers, and drop caps onto A5 paper dimensions."

### The 10-Minute Technical deep dive
"Architecturally, Kahoma is divided into three layers: the Next.js Client, the FastAPI Service API, and the Supabase Data Layer. Let's trace the request lifecycle of a voice upload:
1. The client records audio via the Web Audio API, capturing real-time levels. It POSTs the blob to `/api/v1/chunks/upload` as multipart form data.
2. The FastAPI route validates the Supabase JWT header, uploads the raw audio to Supabase Storage, inserts a pending record into `voice_chunks`, and returns a `202 Accepted` immediately.
3. In the background, `transcribe_chunk` downloads the audio, sends it to OpenAI Whisper, updates the chunk status to `done`, and inserts a `user` message into the `context_messages` table.
4. The orchestrator triggers `process_chunk`. S-Agent and E-Agent are executed concurrently via `asyncio.gather`. S-Agent extracts emotional tone and key moments, while E-Agent parses characters, settings, and relationships, mapping new characters into the `characters` database. Both write to their respective memory stores.
5. The Evaluator Agent parses these stores and transcripts, scoring comprehension across 5 dimensions (completeness, relationships, sentiment, perspective, and coherence). If the score is $<80$, it flags gaps; if a key relationship is ambiguous (a 'catastrophic gap'), it triggers a clarification question regardless of score.
6. The Clarification Agent takes this evaluation and rephrases it into warm, conversational language, appending character photo requests if needed, and inserts the assistant's reply into `context_messages`. Real-time updates are pushed to the client using Supabase Realtime (PostgreSQL replication).
7. When the user triggers book generation, the Breaker Agent divides the history into non-chronological, emotionally resonant chapters. The Proxy Writer runs sequentially per chapter (to maintain context flow) to generate 400-700 word prose. The Picasso agent triggers Replicate SDXL for era-transformations on user photos (or general illustrations), and the Binder compiles the final typeset HTML book in Cormorant Garamond typography."

---

## 2. Abstraction Layers: Abstraction Hierarchy

```
[Client Layer] Next.js App (Web Audio, Zustand, Supabase Realtime)
       ↓ (HTTP REST / JWT)
[API Router] FastAPI api/v1/ (Authentication, Dependency Injection, Validation)
       ↓ (Lifespan / BackgroundTasks)
[Service Orchestrators] services/ (processing_service, book_service)
       ↓ (Asynchronous Threading / asyncio.gather)
[Agent Layer] agents/ (s_agent, e_agent, evaluator, clarification, breaker, proxy_writer, picasso, binder)
       ↓ (tenacity retries / llm_cache)
[Client Wrapper] core/gemini_client.py (google-genai SDK, structured response)
       ↓ (Database Clients)
[Data Layer] Supabase PostgreSQL (sessions, sentiment_store, entity_store, context_messages, processing_log)
```

### 1. Client Layer
*   **What:** React Next.js application with Zustand state management.
*   **Why:** Provides a responsive, modern interface. Uses Web Audio API for recording level diagnostics.
*   **Alternatives:** React Native. We chose Next.js for web accessibility and rapid iteration, keeping Deno edge-style architectures intact.
*   **Tradeoffs:** Next.js requires server/client separation, causing hydration checks, but offers better SEO and desktop compatibility.

### 2. API Router Layer
*   **What:** FastAPI APIRouter modules.
*   **Why:** Handles client requests, schema validation, and route dependencies.
*   **Alternatives:** Flask, Django. FastAPI is chosen because it runs natively async, includes Pydantic validation out-of-the-box, and generates OpenAPI documentation automatically.
*   **Tradeoffs:** Requires handling async database connections carefully to avoid thread starvation, but performs significantly faster than synchronous frameworks under load.

### 3. Orchestration Layer
*   **What:** Python services (`processing_service.py`, `book_service.py`).
*   **Why:** Separates business logic and agent coordinating workflows from API endpoint schemas.
*   **Alternatives:** LangGraph. We chose explicit code orchestrators to minimize latency and token overhead, keeping the system predictable and easily mockable.
*   **Tradeoffs:** Direct code loops require manual state management, but run faster and are easier to unit test.

### 4. Agent Layer
*   **What:** Specialized agent scripts (`s_agent.py`, `e_agent.py`, etc.).
*   **Why:** Modularity. Each agent is responsible for exactly one job, keeping prompts short and output schemas highly specific.
*   **Alternatives:** A single large "Do-it-all" agent.
*   **Tradeoffs:** Multi-agent systems require passing context explicitly, but they prevent prompt bloat and achieve nearly 100% schema compliance compared to single-agent setups.

### 5. Client Wrapper Layer
*   **What:** `gemini_client.py` and `llm_cache.py`.
*   **Why:** Provides resilience, caching, structured output mapping, and token observability in a single place.
*   **Alternatives:** Raw HTTP requests. A wrapper ensures that caching and retries are enforced globally across every agent automatically.

### 6. Data Layer
*   **What:** Supabase Postgres and Storage Buckets.
*   **Why:** Decoupled data layer. Realtime pushes tables updates instantly to clients without polling.
*   **Alternatives:** Local SQLite, Mongo. Postgres provides transactional integrity, relational checks (essential for entities and relationships), and RLS.

---

## 3. Concept Masterclass: First Principles

### 1. FastAPI
*   **What:** A high-performance Python web framework for building APIs.
*   **Analogy:** A fast food counter with separate queues for ordering, cooking, and payment. If one task is delayed, the staff member moves to the next customer instead of waiting.
*   **Internals:** Runs on Starlette (routing/ASGI) and Pydantic (data parsing). Leverages Python's `asyncio` to execute non-blocking I/O.
*   **Kahoma Usage:** Powers `main.py` and routers in `api/v1/`.
*   **Why Chosen:** High concurrency capacity, native async, automatic OpenAPI generation.
*   **Alternatives:** Flask (sync only, needs manual validation), Django (heavyweight, harder to configure for lightweight async microservices).

### 2. Pydantic Structured Outputs
*   **What:** Defining LLM response shapes as Python classes inheriting from `BaseModel`.
*   **Analogy:** An ice-cube tray. No matter how you pour water (text), it freezes into exact, predictable shapes.
*   **Internals:** Passes the JSON Schema representation of the model directly to the Gemini API (`response_schema`). The model enforces this schema at generation time, outputting conforming JSON.
*   **Kahoma Usage:** Models like `SentimentResult`, `EntityExtractionResult`, `EvaluatorResult`, and `BreakerResult` in agent files.
*   **Why Chosen:** Guarantees 100% JSON compliance and removes fragile regex string parsers.
*   **Alternatives:** Prompt engineering instructions (*"Always output JSON..."*). Very unreliable and prone to markdown code block breaks.

### 3. Tenacity Exponential Backoff Retries
*   **What:** Retrying failed API requests with increasing delays.
*   **Analogy:** Knickers on a door. If someone knocks and you don't answer, they wait 2 seconds, then 4 seconds, then 8 seconds before giving up.
*   **Internals:** Wraps functions in decorators that catch specific exceptions, calculate wait times with exponential calculations, and apply random jitter to prevent "thundering herd" problems on servers.
*   **Kahoma Usage:** Wrapped around `_generate_content_with_retry` in `core/gemini_client.py`.
*   **Why Chosen:** Handles transient rate limits (`429`) and server errors (`503`) cleanly.
*   **Alternatives:** Simple try/except loops. Harder to manage wait times and jitter.

### 4. LLM Caching
*   **What:** Storing LLM responses to avoid repeated network calls and token costs.
*   **Analogy:** A cheat sheet. If you've already calculated the answer to a question, you read it from your notes instead of recalculating it.
*   **Internals:** Hashes the system prompt + user prompt + target schema using SHA-256 and stores the response in an in-memory dictionary.
*   **Kahoma Usage:** `core/llm_cache.py` integrated into `call_gemini` and `call_gemini_structured`.
*   **Why Chosen:** Instantly resolves repeated agent calls in sub-milliseconds and avoids token billing during manual tests.
*   **Alternatives:** Redis-based cache (better for production, but in-memory is perfect for isolated, cost-free local debugging).

---

## 4. Multi-Agent Masterclass

### 1. S-Agent (Sentiment Analysis)
*   **Purpose:** Extract overall emotional landscape, tonality, and predicted narrative direction.
*   **Inputs:** Historical messages (`context_messages` compiled).
*   **Outputs:** `SentimentResult` (sentiment, tonality, predicted_future, confidence, moments).
*   **Failure Handling:** Safety bounds in `processing_service.py`. If it throws, we log the exception and fallback to null sentiments.
*   **Why not merge:** E-Agent focuses on nouns (who, where, what), whereas S-Agent focuses on adjectives (emotional weight). Merging them degrades prompt focus and increases token usage per output.

### 2. E-Agent (Entity Extraction)
*   **Purpose:** Extract characters, places, events, and relationships.
*   **Inputs:** Historical messages + existing entities.
*   **Outputs:** `EntityExtractionResult` (entities, relationships, new_characters).
*   **Failure Handling:** Falls back to an empty entities list if extraction fails.
*   **Why not merge:** Relies on details of entity merging and relationship maps. Merging with Evaluator would confuse scoring with extraction tasks.

### 3. Evaluator Agent
*   **Purpose:** Grade understanding across 5 dimensions (completeness, relationships, sentiment, perspective, coherence).
*   **Inputs:** Transcripts, S-Agent outputs, E-Agent outputs.
*   **Outputs:** `EvaluatorResult` (overall_score, decision, question_to_ask, catastrophic_gap).
*   **Failure Handling:** If the evaluation crashes, it falls back to a score of 0 and a default `acknowledge` decision.
*   **Why not merge:** The Evaluator functions as a critic (LLM-as-a-judge). It must stand outside the companion responder to score the pipeline objectively.

### 4. Clarification Agent
*   **Purpose:** Generate warm, friendly conversational feedback or questions.
*   **Inputs:** Session context + Evaluator decisions.
*   **Outputs:** Conversational text.
*   **Failure Handling:** If it crashes, it falls back to a static warm greeting.
*   **Why not merge:** Merging with Evaluator would require the model to perform critical scoring and empathetic writing in a single prompt, resulting in a cold, clinical tone.

### 5. Breaker Agent
*   **Purpose:** Partition the Story Bible into emotionally resonant chapters.
*   **Inputs:** Complete Story Bible (transcript, entities, sentiments).
*   **Outputs:** `BreakerResult` (chapters list, titles, eras, image concepts).
*   **Failure Handling:** If it fails, it defaults to a standard 3-chapter structure.
*   **Why not merge:** Operates on the macro level (the book outline). Must run before the Proxy Writer can write individual chapters.

### 6. Proxy Writer Agent
*   **Purpose:** Write first-person literary prose (400-700 words).
*   **Inputs:** Chapter metadata, characters, sentiments, and segment transcripts.
*   **Outputs:** Literary prose.
*   **Failure Handling:** If a chapter fail to write, it logs the error and proceeds with the next chapter, ensuring the book still compiles.
*   **Why not merge:** Requires a massive context window and high generation capacity. Writing all chapters at once would hit context limits and degrade prose quality.

---

## 5. File-by-File Breakdown

### 1. `backend/core/gemini_client.py`
*   **Purpose:** Intercepts every LLM call, wrapping it in retries and cache checks.
*   **Functions:**
    *   `call_gemini` — Raw text generation.
    *   `call_gemini_structured` — Native Pydantic structured response.
*   **Dependencies:** `google-genai` SDK, `tenacity`, `llm_cache`.
*   **Interacts with:** Called by all 8 agents.
*   **Q: "What happens if Gemini returns a None parsed object in structured mode?"**
    *   *Answer:* "The SDK parser can fail if the response text contains minor formatting issues. I added a fallback step: it extracts the raw text from the response, runs `parse_json_response` (which strips markdown fences and extracts boundaries), and validates it using Pydantic's `model_validate`."

### 2. `backend/core/llm_cache.py`
*   **Purpose:** EPhemeral in-memory dictionary cache.
*   **Functions:**
    *   `get(system, user, schema)` — Computes SHA-256 hash and retrieves cached value.
    *   `set(system, user, val, schema)` — Saves value to cache.
*   **Interacts with:** Called inside `gemini_client.py`.
*   **Q: "Is this cache thread-safe?"**
    *   *Answer:* "In Python, because of the Global Interpreter Lock (GIL) and FastAPI running in an asyncio event loop on a single thread, standard dictionaries are safe from concurrent mutation issues for simple set/get operations. However, for a production environment, I would replace this in-memory dict with Redis to handle scalability and sharing across workers."

### 3. `backend/services/processing_service.py`
*   **Purpose:** Phase 1 orchestrator (transcription chunk processing).
*   **Functions:**
    *   `process_chunk` — Executes sentiment analysis and entity extraction in parallel via `asyncio.gather`, then runs evaluation and clarification.
*   **Interacts with:** Triggered asynchronously by `chunks.py` upload route.
*   **Q: "Why run S-Agent and E-Agent in parallel?"**
    *   *Answer:* "They have no dependencies on each other; both read the same transcripts. By using `asyncio.gather`, we fire both requests concurrently, reducing our pipeline latency from ~8 seconds to ~4.5 seconds."

---

## 6. Prompt Engineering Masterclass

### S-Agent Prompt
*   **Design Decision:** Keeping instructions brief and focusing on the core mission: "Never judge. Always understand." This keeps the model's focus on the emotional tone without distracting it with structural tasks.
*   **System Prompt:**
    ```text
    You are the Sentiment Analysis Agent for Kahoma, a memoir platform.
    Analyze the narrator's full transcript and extract the emotional landscape.
    The narrator is the supreme authority on their own story. Never judge. Always understand.
    ```
*   **Expected Output:** Sentiment, tonality, predicted future, and key emotional moments.
*   **Ambiguity Handling:** If a narrator speaks ambiguously, S-Agent reduces its confidence score, which is then captured by the Evaluator.

### Proxy Writer Prompt
*   **Design Decision:** Uses explicit negative rules: "DO NOT sanitize. DO NOT add false hope." This prevents the model from turning painful memories into generic happy endings.
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
*   **Failure Case:** If the transcript is empty, it relies on character details to generate a reflective bridge chapter rather than crashing.

---

## 7. Database Masterclass

```
┌──────────────┐       1:N       ┌─────────────────────┐
│   sessions   ├────────────────►│  context_messages   │
└──────┬───────┘                 └─────────────────────┘
       │ 1:1
       ├────────────────────────► [sentiment_store]
       │ 1:1
       ├────────────────────────► [entity_store]
       │ 1:N
       ├────────────────────────► [characters]
       │ 1:N
       ├────────────────────────► [chapters]
       │ 1:1
       └────────────────────────► [books]
```

### Relational Schema Choices
*   **Sessions:** UUID PK, tracks status (recording, processing_chunk, awaiting_user, generating_book, book_ready, failed), phase (1 or 2), and title.
*   **Context Messages:** Tracks dialogue bubbles, mapping transcript segments to chunk IDs.
*   **Sentiment Store / Entity Store:** Holds JSON payloads of parsed agent outputs.
*   **Processing Log:** Transaction log capturing event latency, errors, and custom parameters for audits.

### Performance & Scaling Tradeoffs
*   **Q: "Why use Postgres instead of a Vector Database for context storage?"**
    *   *Answer:* "We do not perform semantic similarity search for the context history. The conversation is linear, and we need exact, ordered messages to construct the prompt history. Relational Postgres ensures foreign key integrity and transactional safety for the memoir layers. If we add cross-book semantic search in the future, we can enable pgvector on this same database."

---

## 8. API Masterclass

### 1. `POST /api/v1/chunks/upload`
*   **Flow:** Receives session ID, chunk order, and audio file.
*   **Authorization:** Reads Bearer token, validates via Supabase, and checks if session ownership matches `user_id`.
*   **Response:** Returns `202 Accepted` with chunk ID.
*   **Async Logic:** Starts transcription and processing in a background task thread, ensuring the API responds instantly to prevent mobile timeouts.

### 2. `POST /api/v1/sessions/{id}/generate-book`
*   **Flow:** Verifies session ownership, asserts state is not already generating, and launches `generate_book` as a FastAPI background task.
*   **Response:** Returns `202 Accepted` immediately.

---

## 9. AI & LLM Deep Dive

### 1. Structured Outputs
*   **What:** Enforcing the API to return responses matching a JSON Schema.
*   **Analogy:** A form with text fields and age numbers. If you put text in the age field, the form is rejected before submission.
*   **How Kahoma uses it:** By passing Pydantic models to Gemini's `response_schema`, ensuring type safety across the entire agent pipeline.

### 2. Multi-Agent Coordination
*   **What:** Dividing a complex goal into specialized agents cooperating over shared state.
*   **How Kahoma uses it:** S-Agent, E-Agent, Evaluator, and Clarification coordinate on top of Supabase tables. One agent's output is written to the DB, which the next agent reads as context.

---

## 10. Engineering Defense: Defend Your Code

### 1. "Why didn't you use LangGraph or CrewAI for orchestration?"
*   **Defense:** "LangGraph and CrewAI add significant overhead, abstraction layers, and latency. They are excellent for complex cyclic graphs, but Kahoma's workflow is a deterministic, linear pipeline (Phase 1: Extract $\rightarrow$ Score $\rightarrow$ Respond; Phase 2: Structure $\rightarrow$ Write $\rightarrow$ Bind). Implementing this in native Python using `asyncio` gives us full control, sub-millisecond execution overhead, and makes debugging straightforward."

### 2. "Why use FastAPI BackgroundTasks instead of Celery or ARQ?"
*   **Defense:** "For our current scale, FastAPI's built-in `BackgroundTasks` is lightweight and runs in-process without requiring a separate Redis or RabbitMQ broker. This reduces infrastructure complexity and deployment costs. However, because our architecture isolates services, transitioning to Celery or ARQ in the future would simply require wrapping the service calls in Celery tasks without changing any API or agent code."

### 3. "Why are you bypassing Supabase RLS and using the service-role key in FastAPI?"
*   **Defense:** "We use a service-role key because our background processing services need to perform complex queries, inserts, and bulk updates across multiple tables (such as updating logs, processing chunks, and generating books) asynchronously without a user request context. Row-level security is enforced at the API routing layer: we extract and verify the user ID from the Supabase JWT on every endpoint, ensuring tenant isolation before invoking services."

---

## 11. Code Lookup Table

| Concept | File Path | Class / function | Purpose |
| :--- | :--- | :--- | :--- |
| **JWT Validation** | `backend/api/v1/deps.py` | `get_current_user_id` | Verifies bearer token and extracts owner user ID |
| **Resilient Retry** | `backend/core/gemini_client.py` | `_generate_content_with_retry` | Tenacity exponential retry logic |
| **LLM Caching** | `backend/core/llm_cache.py` | `LLMCache` | SHA-256 hashed exact prompt caching |
| **Structured Output** | `backend/core/gemini_client.py` | `call_gemini_structured` | Configures `response_schema` in Gemini SDK |
| **Parallel Extraction** | `backend/services/processing_service.py`| `process_chunk` | Orchestrates parallel S-Agent and E-Agent runs |
| **Chapter Partition** | `backend/agents/breaker.py` | `run_breaker` | Divides memoirs into emotional chapter lists |
| **Typeset Compiler** | `backend/agents/binder.py` | `_build_book_html` | Generates book HTML with custom typography and drop-caps |
| **Database Audit** | `backend/core/audit.py` | `log_event` | Writes token metrics and latency values to DB |

---

## 12. Mock Interviews & Defense

### Backend Engineer Loop
*   **Q: "If two chunks are uploaded concurrently for the same session, how do you prevent race conditions in context messages?"**
    *   *Answer:* "Each message is appended with a `message_order` index. To prevent duplicate indices, we calculate the next index inside a database transaction or read the maximum order index. In a high-concurrency setup, we would add a unique constraint on `(session_id, message_order)` at the database level and handle insert conflicts gracefully."

### AI/LLM Engineer Loop
*   **Q: "How do you evaluate if the Proxy Writer's prose is faithful to the transcript?"**
    *   *Answer:* "We can implement an LLM-as-a-judge evaluation script. The judge receives the raw transcript segment and the written chapter prose, then scores them on faithfulness (hallucination detection) and completeness (did it miss any major events?). This metric can be logged in the `processing_log` table for continuous pipeline auditing."

---

## 13. Final Cheat Sheet (30-Minute Revision Guide)

*   **FastAPI Lifespan:** We use FastAPI's lifespan configuration to eagerly initialize the Supabase and Gemini clients at startup, catching any missing credentials immediately.
*   **Mock Mode:** Toggled via `MOCK_MODE=true` in `.env`. It simulates Whisper transcripts, agent outputs, and book generation, enabling full system validation without API billing.
*   **CSS Print Specifications:** The Binder agent uses `@page { size: 148mm 210mm; margin: 22mm 18mm 20mm 22mm; }` to target A5 paperback dimensions, using `page-break-before: always` to separate chapters.
*   **Observability:** Captured in `core/gemini_client.py` by parsing `response.usage_metadata` to log prompt and candidate token counts, and calculating latency.
