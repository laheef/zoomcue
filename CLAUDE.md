# ZoomCue build rules

## Scope
ZoomCue is a Node.js 20 + MySQL application. The web process owns HTTP/auth/API boundaries. Long-running browser, narration, audit, and rendering work belongs in worker processes.

## Security
- Never log API keys, cookies, storageState, passwords, prompts containing secrets, or provider responses that may contain secrets.
- Keep provider keys encrypted with AES-256-GCM and decrypt only inside the provider adapter that needs them.
- Use HTTP-only, Secure, SameSite cookies in production; validate CSRF on every cookie-authenticated mutation.
- Validate every input with a schema before business logic. Escape user content on render.
- Only fetch user URLs after SSRF validation; allow http/https, reject loopback, link-local, private, metadata, and DNS-rebinding resolutions.
- Enforce per-IP and per-user limits. Add timeouts, bounded retries with jitter, and circuit breakers for providers.
- Every resource query must be scoped by the authenticated user or workspace.

## Structure
Keep routes, services, provider adapters, database access, workers, and UI separate. Split files before they become difficult to test. Use one provider interface for script writers and one for voices.

## Data and jobs
Use MySQL migrations, indexes, transactions, idempotency keys, and cursor pagination. Job state must be durable and resumable; do not keep production work only in process memory. Store large assets in object storage, not MySQL.

## Reliability and observability
Use structured JSON logs with request_id and job_id. Return safe errors to users and capture full details in error tracking. All outbound calls need a timeout. Jobs must be retryable and idempotent.

## Quality
Add unit tests for auth, authorization, validation, crypto, provider adapters, SSRF checks, and job state transitions. Add Playwright critical-flow tests before shipping.
