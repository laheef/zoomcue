# ZoomCue / Zoomcue

ZoomCue is an AI walkthrough generator: provide a URL and a brief, then the platform explores the page, writes a timed script, generates narration, validates every action, audits camera moves, and renders a shareable walkthrough.

## Product preview

### New video
![New video screen](docs/screenshots/new-video.svg)

### Transparent pipeline audit
![Pipeline audit screen](docs/screenshots/audit-pipeline.svg)

The UI prototype can be started with the zero-dependency preview server:

```bash
node server.js
# http://localhost:4173
```

## Architecture

```text
Browser UI
   |
Node web/API process  ── MySQL (users, videos, scripts, jobs, encrypted provider keys)
   |
Redis / BullMQ
   ├── pipeline worker: Playwright exploration, dry-run, screenshots, cue checks
   └── render worker: TTS, Remotion, FFmpeg, camera audit, R2 uploads
```

The production foundation is split into modules under `src/` and keeps provider secrets out of the browser. Long jobs must run in workers, not inside an HTTP request.

## Local setup

### Requirements

- Node.js 20+
- MySQL 8+
- Redis 6+ or a managed Redis-compatible service
- Chromium dependencies for Playwright
- FFmpeg for rendering
- Cloudflare R2 bucket for large assets
- Provider keys for the providers you want to use

### Install

```bash
git clone https://github.com/laheef/zoomcue.git
cd zoomcue
npm ci
cp .env.example .env
```

Generate strong secrets:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Put one 64-character hex value in `DATA_ENCRYPTION_KEY`, and a separate long random value in `JWT_SECRET`.

### Configure MySQL

Create the database and first schema:

```bash
mysql -u root -p < schema.sql
npm run migrate
```

The application uses MySQL for metadata only. Do not store MP4s, screenshots, audio, or page snapshots in MySQL.

### Configure Redis

Local Redis:

```env
REDIS_URL=redis://127.0.0.1:6379
```

Managed Redis:

```env
REDIS_URL=rediss://username:password@your-redis-host:6380
```

### Configure environment

Required values:

```env
NODE_ENV=production
APP_URL=https://laheef.dev
PORT=4173
JWT_SECRET=replace-with-a-long-random-secret
DATA_ENCRYPTION_KEY=64-hex-characters
COOKIE_SECURE=true

MYSQL_HOST=127.0.0.1
MYSQL_PORT=3306
MYSQL_DATABASE=zoomcue
MYSQL_USER=zoomcue_user
MYSQL_PASSWORD=strong-password

REDIS_URL=rediss://...
CORS_ORIGINS=https://laheef.dev

R2_ENDPOINT=https://<account-id>.r2.cloudflarestorage.com
R2_ACCESS_KEY_ID=...
R2_SECRET_ACCESS_KEY=...
R2_BUCKET=zoomcue-assets
```

Never commit `.env`. `.env.example` is safe to commit; it contains no live credentials.

### Run locally

Web/API server:

```bash
npm start
```

Pipeline worker:

```bash
npm run worker
```

Database migrations:

```bash
npm run migrate
```

Tests:

```bash
npm test
```

For the browser worker, install Chromium once:

```bash
npx playwright install chromium
```

## Provider setup

Open the in-app **API keys** screen. Keys are sent only to the selected provider and are stored encrypted at rest by the production API.

Recommended starting configuration:

- Google AI Studio / Gemini Flash for script writing
- Deepgram Aura for free-tier voice generation
- ElevenLabs for higher-fidelity voice upgrades
- OpenAI or any OpenAI-compatible endpoint as an alternate writer

For a custom writer, provide:

```text
Provider name
Base URL ending in /v1
Model name
API key
```

## Chrome extension setup

The extension is in `extension/` and uses Manifest V3 without a build step.

### Load locally

1. Open Chrome.
2. Visit `chrome://extensions`.
3. Enable **Developer mode**.
4. Click **Load unpacked**.
5. Select the repository's `extension/` directory.
6. Reload the ZoomCue app.

The extension has two jobs:

```text
ssv:fetch-page
```

Uses the user's Chrome session to serialize a page snapshot for login-protected or bot-checked pages.

```text
ssv:sign-in
```

Reads the target site's cookies and localStorage only after confirming it is not showing a login form. It never types or reads passwords. Storage state must be encrypted, job-scoped, and deleted after the recording pass.

For Chrome Web Store publishing, update `extension/manifest.json`, add store icons, set the production app origin in `content_scripts.matches`, and upload the extension from the Chrome Developer Dashboard.

## Hostinger deployment

Hostinger's Node.js application feature can host the web process if the plan allows persistent Node processes. The full pipeline also needs long-running worker processes and Chromium/FFmpeg support.

### Recommended process layout

```text
Node app 1: web/API server
Node app 2: pipeline worker
Node app 3: render worker
```

Keep Redis and R2 external if Hostinger does not provide them.

### Hostinger steps

1. Create a MySQL database and user in hPanel.
2. Create a Redis database externally if Redis is not available in hPanel.
3. Create a Cloudflare R2 bucket and access key with only the required bucket permissions.
4. Upload the repository or deploy it from Git.
5. Set the Node.js application root to the repository directory.
6. Set the Node.js version to 20 or newer.
7. Run:

   ```bash
   npm ci --omit=dev
   npm run migrate
   ```

8. Add all `.env` values through the hosting environment settings, not a committed file.
9. Set the web startup command to:

   ```bash
   npm start
   ```

10. Start the pipeline and render workers as separate persistent applications if the plan supports them.
11. Point `laheef.dev` DNS to Hostinger and configure HTTPS.
12. Set:

   ```env
   APP_URL=https://laheef.dev
   CORS_ORIGINS=https://laheef.dev
   COOKIE_SECURE=true
   ```

13. Verify HTTPS redirects, secure cookies, login, provider key tests, video creation, queue progress, and download expiry before accepting users.

### Hostinger compatibility check

Shared hosting can restrict the exact processes this product needs. Verify these items before production:

- Persistent Node worker processes
- Redis outbound connections
- Playwright Chromium installation and sandboxing
- FFmpeg availability
- WebSocket or polling support
- Process restart behavior
- Maximum execution time and memory

If Chromium or FFmpeg cannot run on the plan, keep the web/API app on Hostinger and run pipeline/render workers on a small VPS or managed container service. The BullMQ architecture supports this split.

## Security checklist

- Use HTTPS and HSTS in production.
- Use secure, HTTP-only, SameSite cookies.
- Keep API keys encrypted and never log them.
- Rotate exposed keys immediately.
- Use CSRF tokens for cookie-authenticated mutations.
- Keep CORS limited to `https://laheef.dev`.
- Validate and SSRF-check every user-provided URL.
- Use MySQL transactions for multi-write state transitions.
- Add indexes before scaling list endpoints.
- Use cursor pagination for large video libraries.
- Store assets in R2, not MySQL.
- Run workers with bounded concurrency and retry policies.
- Keep browser storageState short-lived and job-scoped.
- Run unit, integration, and Playwright critical-flow tests before deploy.

## Current production notes

The repository includes the production boundaries, schema, encrypted-key model, provider adapters, queue wiring, request/security helpers, Playwright worker, migration runner, tests, and deployment documentation. Before launch, connect the render worker's Remotion composition and R2 adapter, configure the actual Redis/MySQL/R2 credentials, and complete a staging load/failure test.
