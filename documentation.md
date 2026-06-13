# Kahoma Web — System Architecture & Engineering Documentation

This document describes the architecture, database design, and key engineering decisions behind Kahoma, a voice-first memoir creation platform.

---

## 1. System Architecture

```
┌──────────────────────────────────────────────────────────────┐
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

---

## 2. 6-Agent AI Pipeline Flow

When the user records stories, the backend processes them through a multi-agent workflow:

1.  **S-Agent (Sentiment Analysis):** Extracts the overall emotional landscape, tone, and predicted narrative direction.
2.  **E-Agent (Entity Extraction):** Identifies characters, places, and events, preserving the narrator's emotional perspective.
3.  **Evaluator Scorer:** Scores story understanding across 5 dimensions. If the score is below 80, it flags a gap and requests clarification.
4.  **Clarification Agent:** Generates warm, human-like responses or prompts based on the Evaluator's decision.
5.  **Breaker Agent:** Structures the complete story into an optimal set of chapters, focusing on emotional resonance.
6.  **Proxy Writer:** Generates literary prose (400-700 words per chapter) from transcript segments and outlines.

---

## 3. Database Design

Kahoma utilizes PostgreSQL with the following core tables:
*   `sessions`: Stores story sessions (title, status, user_id, current phase).
*   `context_messages`: Stores dialogue bubbles between user (transcript) and assistant.
*   `sentiment_store` & `entity_store`: Store structured outcomes of S-Agent and E-Agent runs.
*   `characters`: Tracks identified characters, relationship details, and photo status.
*   `chapters`: Stores structured chapter listings (title, era, transcript segment links, image prompt, and written prose).
*   `books`: Tracks the generated book status and output PDF URL.
*   `processing_log`: Audit trail tracking latency, token usage, and events.

---

## 4. Engineering Decisions (ADRs)

### ADR-013: Native Pydantic Structured Outputs
*   **Decision:** Replaced prompt-based JSON scraping with native Pydantic model schemas passed directly to Gemini's `response_schema` configuration.
*   **Rationale:** Handlers were fragile, prone to breaks when the model returned trailing markdown blocks or minor syntax errors. Enforcing schemas at the API level guarantees type safety and parsing reliability.
*   **Trade-off:** Reduces model response flexibility, but increases reliability to 100%.

### ADR-014: In-Memory LLM Caching
*   **Decision:** Created an in-memory cache utility keyed on hashes of the system prompt + user prompt + schema name.
*   **Rationale:** Minimizes costs and latency during testing or repetitive pipeline execution (such as multiple evaluation cycles on identical transcripts).
*   **Trade-off:** The cache is ephemeral and clears on server restart. In high-traffic production, this should be moved to Redis.

### ADR-015: Tenacity Exponential Backoff Retries
*   **Decision:** Wrapped all Gemini API transactions with `tenacity` retries.
*   **Rationale:** Cloud API endpoints are prone to rate limits (HTTP 429) or transient timeouts. Exponential backoff retries ensure requests recover gracefully without failing the pipeline.
*   **Trade-off:** Increases response latency for failed calls before success, but avoids complete pipeline failures.
