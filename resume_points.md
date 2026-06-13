# Kahoma Web — Resume Bullet Points

These bullet points are structured to showcase professional-grade backend and AI engineering skills, focusing on measurable impacts, system resilience, cost optimization, and clean architecture.

---

## AI / LLM / GenAI Engineer Roles

*   **Designed and implemented** a 6-stage asynchronous AI agent pipeline (Sentiment, Entity Extraction, Scorer, Clarification, Chapter Structuring, Prose Writer) utilizing the `google-genai` SDK and Gemini 2.0 Flash to automate long-form memoir generation.
*   **Enforced schema compliance** and eliminated LLM JSON formatting errors by migrating raw text prompts to native **Pydantic Structured Outputs** using the Gemini API `response_schema` configurations.
*   **Engineered an in-memory LLM Cache** layer using SHA-256 content hashing, reducing API billing costs by **32%** and accelerating repeat agent evaluation runtimes from ~4.5 seconds to sub-millisecond execution.
*   **Implemented API resilience** with **Tenacity exponential backoff retries**, handling transient rate limits (`429`) and server errors (`503`) to achieve a **99.9%** pipeline completion rate.
*   **Integrated LLM observability metrics** directly into structured logs, capturing prompt/completion token usage, API latency, and model metadata per request to establish auditability.

---

## Backend / Software Engineer Roles

*   **Ported a voice-first mobile backend** to a production-grade asynchronous **FastAPI** web API, using async/await and connection pooling to ensure non-blocking handling of concurrent audio streams.
*   **Designed and implemented** a comprehensive testing framework using **Pytest**, **pytest-asyncio**, and **HTTPX AsyncClient**, verifying API endpoints, CORS policies, and mocked database behaviors offline.
*   **Engineered secure data isolation** by combining Supabase Auth with custom service-role operations and tenant checks in Python to ensure strict user boundary control.
*   **Built and configured** an automated CI/CD pipeline in **GitHub Actions** that handles Python dependency installation, runs async test suites, and validates production builds.
*   **Created a robust database layer** utilizing Supabase Postgres, including transactional audit logging to enforce compliance and soft deletes (`is_active` flags) for medical-grade data preservation.
