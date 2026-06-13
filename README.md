# Kahoma — Voice-First AI Memoir Platform

> **"Every life holds a story worth telling, but most people will never write a book."**
> 
> Kahoma is a production-grade memoir platform that enables users to speak their life stories and automatically compiles them into beautifully typeset, publication-ready books. Built with a resilient multi-agent orchestration pipeline, Next.js, FastAPI, and Supabase.

---

## ✦ Live Production Endpoints

*   **Next.js Web Application:** [web-eight-sepia-qpmb3ekh7d.vercel.app](https://web-eight-sepia-qpmb3ekh7d.vercel.app)
*   **FastAPI API Base Service:** [backend-phi-five-39.vercel.app](https://backend-phi-five-39.vercel.app)
*   **API Swagger Docs:** [backend-phi-five-39.vercel.app/docs](https://backend-phi-five-39.vercel.app/docs)
*   **System Health Monitor:** [backend-phi-five-39.vercel.app/health](https://backend-phi-five-39.vercel.app/health)

---

## ✦ System Architecture

```mermaid
graph TD
    classDef client fill:#1c1917,stroke:#C9933A,stroke-width:1px,color:#ede9e0;
    classDef api fill:#0f172a,stroke:#38bdf8,stroke-width:1px,color:#ede9e0;
    classDef service fill:#1e1b4b,stroke:#818cf8,stroke-width:1px,color:#ede9e0;
    classDef db fill:#064e3b,stroke:#34d399,stroke-width:1px,color:#ede9e0;
    classDef external fill:#27272a,stroke:#71717a,stroke-width:1px,color:#ede9e0;

    Client[Next.js Web Client<br/>Web Audio API / Zustand]:::client
    FastAPI[FastAPI Router Layer<br/>JWT Auth / BackgroundTasks]:::api
    Orch[Service Orchestrators<br/>asyncio.gather / Python]:::service
    Supabase[(Supabase PostgreSQL<br/>& Storage Buckets)]:::db
    Realtime[Supabase Realtime<br/>Postgres Replication]:::db
    Whisper[OpenAI Whisper API<br/>transcription]:::external
    Gemini[Gemini 2.0 Flash<br/>Multi-Agent reasoning]:::external
    Replicate[Replicate SDXL<br/>era illustrations]:::external

    Client -- 1. Uploads Voice Chunk --> FastAPI
    FastAPI -- 2. Stores audio / returns 202 --> Supabase
    FastAPI -- 3. Triggers task --> Orch
    Orch -- 4. Transcribes --> Whisper
    Orch -- 5. Runs Agents --> Gemini
    Orch -- 6. Generates Images --> Replicate
    Orch -- 7. Saves transcript / books --> Supabase
    Supabase -- 8. Broadcasts change --> Realtime
    Realtime -- 9. Renders feedback --> Client
```

---

## ✦ 6-Agent AI Pipeline Flow

When storytelling, Kahoma processes audio chunks and generates books through a structured multi-agent loop:

```mermaid
sequenceDiagram
    autonumber
    actor User as Client
    participant P1 as process_chunk (Phase 1)
    participant S as S-Agent (Sentiment)
    participant E as E-Agent (Entity)
    participant Eval as Evaluator
    participant Clar as Clarification
    participant P2 as generate_book (Phase 2)
    participant ChBreak as Breaker (Chapters)
    participant Write as Proxy Writer
    participant Pic as Picasso (SDXL)
    participant Bind as Binder (Typeset)

    Note over User, Clar: Phase 1: Dialogue & Extraction
    User->>P1: Upload Voice Chunk
    par S-Agent (Sentiment)
        P1->>S: Run sentiment check
        S-->>P1: Emotional landscape
    and E-Agent (Entity)
        P1->>E: Run entity extraction
        E-->>P1: Characters / Places / Relations
    end
    P1->>Eval: Evaluate understanding (Score 0-100)
    Eval-->>P1: Decision (Ask / Acknowledge)
    P1->>Clar: Rephrase feedback into warm prompt
    Clar-->>User: Conversational reply & Photo request

    Note over User, Bind: Phase 2: Memoir Publication
    User->>P2: Trigger Publishing ("That's my story")
    P2->>ChBreak: Partition Story Bible into chapters
    ChBreak-->>P2: Chapter outlines & Image concepts
    loop For each Chapter
        P2->>Write: Write 700-word prose (1st Person)
        Write-->>P2: Written text
    end
    P2->>Pic: Era-transform photos / Generate illustrations
    Pic-->>P2: Image URLs
    P2->>Bind: Assemble book HTML (Typography: Cormorant Garamond)
    Bind-->>User: Complete Memoir Ready
```

---

## ✦ Key Engineering Features

1.  **Pydantic Structured Outputs:** Migrated all agent boundaries (`s_agent`, `e_agent`, `evaluator`, `breaker`) to native Pydantic schema verification. Models enforce formatting rules directly at generation time using Gemini's `response_schema` configuration, achieving 100% schema conformance.
2.  **API Resilience (Tenacity Retries):** Wrapped LLM API interactions with `tenacity` exponential backoff retries with random jitter, recovering from transient timeout and rate-limit triggers automatically.
3.  **In-Memory LLM Caching:** Stores and resolves identical agent prompts in sub-milliseconds using SHA-256 hashes of system and user inputs, eliminating token billing during test loops.
4.  **Parallel Execution:** Orchestrates S-Agent and E-Agent tasks concurrently via `asyncio.gather`, cutting Phase 1 processing times by nearly 50%.
5.  **Typeset Compiler:** Binder compiles chapter structures, title pages, running headers, and drop caps onto A5 paperback dimensions using custom CSS print sheets.

---

## ✦ Repository Layout

*   **[documentation.md](file:///g:/kahoma/documentation.md):** System architecture guide, ADR logs, database schema details, and runtime specifications.
*   **[interview_prep.md](file:///g:/kahoma/interview_prep.md):** Full Project Defense Bible, including concept definitions, mock interview questions, and core code path tables.
*   **[resume_points.md](file:///g:/kahoma/resume_points.md):** Quantifiable, JD-optimized resume bullet points for Backend and AI Engineering roles.

---

## ✦ Directory Structure

```text
├── .github/workflows/
│   └── deploy.yml          # GitHub Actions CI/CD Pipeline
├── backend/                    # Python/FastAPI Backend
│   ├── agents/                 # Multi-Agent implementations (binder, breaker, s_agent, etc.)
│   ├── api/v1/                 # FastAPI routers & JWT Auth dependencies
│   ├── core/                   # Caching, audit loggers, and resilient Gemini wrapper
│   ├── schemas/                # Pydantic schema request models
│   ├── tests/                  # Pytest unit and integration test suites
│   ├── main.py                 # Application entrypoint
│   └── requirements.txt        # Python dependencies
├── supabase/                   # Database migrations & configuration
└── web/                        # Next.js Web App
    ├── src/app/                # Client pages, authentication, & global CSS styles
    └── src/hooks/              # Custom hooks (recording levels, Supabase realtime)
```

---

## ✦ Getting Started

### Prerequisites
*   Node.js v20+
*   Python 3.12 (with py launcher)

### Local Configuration
Create `backend/.env`:
```ini
SUPABASE_URL=https://your-ref.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_JWT_SECRET=your-jwt-secret

GEMINI_API_KEY=your-gemini-key
OPENAI_API_KEY=your-openai-key
REPLICATE_API_KEY=your-replicate-key

MOCK_MODE=true # Keep true to run tests and debug cost-free
```

### Running Backend
```bash
cd backend
pip install -r requirements.txt
py main.py
```

### Running Frontend
```bash
cd web
npm install
npm run dev
```

### Running Tests
Execute the comprehensive Pytest suite:
```bash
cd backend
py -m pytest tests/ -v
```

---

## ✦ License & Acknowledgement
Kahoma is built for family heritage preservation. Named after Kahoma. Speak, be remembered.
