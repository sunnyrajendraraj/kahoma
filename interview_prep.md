# Kahoma Web — Technical Interview Preparation Guide

This guide is prepared to help you master technical interviews when discussing the Kahoma project. It details the core engineering decisions, tradeoffs, security mechanisms, and resilience features of the architecture.

---

## 1. Resilience & Reliability (Tenacity Retries)

### Q: "How do you handle rate-limiting or network timeouts when calling LLM APIs in production?"
*   **Answer:** "I wrapped all API transactions in a resilient retry loop using the `tenacity` library. The decorator is configured with **exponential backoff** and jitter (e.g., doubling the wait time starting at 2 seconds up to a maximum of 10 seconds, stopping after 3 attempts). It specifically retries on `APIError` and connection timeouts, allowing the application to recover from transient cloud errors without throwing 500 errors to the user."
*   **Tradeoffs:** Retries can hold requests open longer, increasing latency during transient outages. However, completing the request is far better than crashing the user experience.
*   **Alternatives:** A background job queue (like Celery or ARQ) could retry failed jobs asynchronously. I chose in-process retries for route-bound calls because they keep the architecture simple and responsive.

---

## 2. API Schema Integrity (Structured Outputs)

### Q: "LLMs are notoriously bad at strictly adhering to JSON formats. How did you solve this?"
*   **Answer:** "Instead of using regex patterns to parse markdown blocks from text responses, I migrated the agents to use **native Pydantic structured outputs**. I passed Pydantic classes (e.g. `SentimentResult`, `EntityExtractionResult`, `BreakerResult`) directly to the Gemini API's `response_schema` configuration in the `google-genai` SDK. The API returns a pre-parsed, validated Python object, guaranteeing 100% schema conformance."
*   **Tradeoffs:** If the model fails to populate a required field, Pydantic raises a validation error. I mitigated this by ensuring fields that can be empty are marked as `Optional` in the schemas.
*   **Alternatives:** One alternative is using JSON schema strings in system prompts and validating after receipt. However, passing the Pydantic class to the model directly is cleaner because the model is aware of the exact schema requirements during generation.

---

## 3. Cost & Latency Optimization (LLM Cache)

### Q: "AI tokens are expensive. How did you optimize LLM query costs?"
*   **Answer:** "I built an **in-memory LLM Caching Layer** (`llm_cache.py`). The cache computes a SHA-256 hash of the system instruction, user prompt, and target schema. Before making any API call, the client checks the cache. If it hits, it returns the stored result instantly (sub-millisecond), skipping the network hop and token billing."
*   **Tradeoffs:** An in-memory dictionary is ephemeral and will be cleared if the server restarts.
*   **Alternatives:** For production scaling, I would move the cache store to **Redis** to ensure persistency and sharing across multiple backend instances.

---

## 4. Test Isolation & Mocking (Pytest Async)

### Q: "How did you write test suites for a backend that relies on Supabase and Gemini without incurring network calls or DB mutations?"
*   **Answer:** "I implemented a **global mock decorator** in `tests/conftest.py` that intercepts calls to `get_supabase()` and `get_supabase_client()` before the FastAPI routes are imported. The mock client simulates Supabase's builder chain (`table().select().eq().execute()`) and returns customizable mocked data. This isolates the tests, allowing them to run 100% offline, instantly, and reliably."
*   **Tradeoffs:** Mocking can miss changes in the real database schema. I recommend running integration tests against a staging database in the CI pipeline to catch schema drift.
*   **Alternatives:** Testcontainers (spinning up a real PostgreSQL container) is more realistic but increases test suite execution times significantly.

---

## 5. Row-Level Security & Data Isolation

### Q: "How do you ensure user A cannot access or mutate user B's stories?"
*   **Answer:** "I use stateless JWT authentication. The client passes the Supabase JWT in the `Authorization` header. The backend dependency (`get_current_user_id`) validates this token and extracts the `user_id` from the secure payload. Every single database query filters explicitly by this extracted `user_id`. A user cannot pass another user's ID because the JWT signature is verified on every request."
*   **Tradeoffs:** Querying or filtering by `user_id` in Python code requires discipline to ensure you never miss a filter.
*   **Alternatives:** PostgreSQL Row-Level Security (RLS) policies. I chose python-level filtering because the FastAPI backend connects using a service-role key to bypass RLS, concentrating all authorization checks in the application code for visibility and testing.
