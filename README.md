# ZoomCue / Zoomcue

ZoomCue is an AI walkthrough generator: provide a URL and a brief, then the platform explores the page, writes a timed script, generates narration, validates every action, audits camera moves, and renders a shareable walkthrough.

## Product preview

### New video
![New video screen](docs/screenshots/new-video.svg)

### Transparent pipeline audit
![Pipeline audit screen](docs/screenshots/audit-pipeline.svg)

### Script review
![Script review screen](docs/screenshots/script-review.svg)

### Narration
![Narration screen](docs/screenshots/narration.svg)

### Camera audit
![Camera audit screen](docs/screenshots/camera-audit.svg)

### Final video
![Video ready screen](docs/screenshots/video-ready.svg)

### Product flow animation

[Download the ZoomCue flow video](docs/zoomcue-flow.mp4)

![ZoomCue flow animation](docs/zoomcue-flow.svg)

The flow covers: Explore → Write → Dry-run → Narrate → Audit → Render. The production render worker creates the downloadable MP4 through Remotion and FFmpeg.

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
APP_URL=https://digital360.store
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
CORS_ORIGINS=https://digital360.store

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

## Vercel deployment

Vercel is used for the ZoomCue web/API layer. Do **not** run Playwright, FFmpeg, Remotion, or a persistent BullMQ worker inside a Vercel function: serverless functions are short-lived and do not provide a durable worker process. Deploy the web layer to Vercel and deploy the worker separately to a container/VPS platform.

### What runs where

```text
Vercel
  Web UI, authentication, provider settings, API routes

Managed MySQL
  Users, videos, scripts, jobs, metadata

Upstash Redis or Redis Cloud
  BullMQ queue and job events

Railway / Render / Fly.io / VPS worker
  Playwright, TTS, camera audit, Remotion, FFmpeg

Cloudflare R2
  MP4, audio, screenshots, page snapshots, SRT/VTT
```

### 1. Prepare the repository

```bash
git clone https://github.com/laheef/zoomcue.git
cd zoomcue
npm ci
npm run migrate
```

The repository includes `vercel.json` and `api/index.js` for the Vercel web/API entrypoint.

### 2. Create the Vercel project

1. Sign in at https://vercel.com.
2. Click **Add New → Project**.
3. Import `laheef/zoomcue` from GitHub.
4. Choose the repository root as the project root.
5. Keep the framework as **Other**.
6. Deploy once so Vercel creates the project.
7. Add the production domain:

   ```text
   digital360.store
   ```

8. In your DNS provider, add the records Vercel shows. Usually this is an A record for the apex domain and a CNAME for `www`.
9. Wait for Vercel SSL to become active before enabling secure cookies.

### 3. Add Vercel environment variables

In **Vercel → Project → Settings → Environment Variables**, add these to Production, Preview, and Development as appropriate:

```env
NODE_ENV=production
VERCEL=1
APP_URL=https://digital360.store
PORT=3000
COOKIE_SECURE=true
CORS_ORIGINS=https://digital360.store

JWT_SECRET=<long-random-value-at-least-32-characters>
DATA_ENCRYPTION_KEY=<64-lowercase-hex-characters>

MYSQL_HOST=<managed-mysql-host>
MYSQL_PORT=3306
MYSQL_DATABASE=zoomcue
MYSQL_USER=<mysql-user>
MYSQL_PASSWORD=<mysql-password>

REDIS_URL=rediss://<redis-user>:<redis-password>@<redis-host>:6380

R2_ENDPOINT=https://<account-id>.r2.cloudflarestorage.com
R2_ACCESS_KEY_ID=<r2-access-key>
R2_SECRET_ACCESS_KEY=<r2-secret>
R2_BUCKET=zoomcue-assets
```

Generate secrets locally and paste the output into Vercel; never commit them:

```bash
openssl rand -hex 32
openssl rand -base64 48
```

Redeploy after changing environment variables.

### 4. Create managed MySQL

Use a MySQL provider that allows remote TLS connections, for example PlanetScale, Aiven, Railway MySQL, DigitalOcean Managed MySQL, or another managed MySQL host.

1. Create a MySQL 8 database named `zoomcue`.
2. Create a dedicated application user.
3. Grant only the required database permissions.
4. Require TLS if your provider supports it.
5. Copy the host, port, database, username, password, and CA/TLS requirements into Vercel variables.
6. From a secure local shell, run:

   ```bash
   MYSQL_HOST=... MYSQL_PORT=3306 MYSQL_DATABASE=zoomcue \
   MYSQL_USER=... MYSQL_PASSWORD=... npm run migrate
   ```

7. Verify that tables and indexes from `schema.sql` exist.

Do not expose MySQL directly to the browser. Only the Vercel API and worker should connect to it.

### 5. Create Redis for BullMQ

Use Upstash Redis, Redis Cloud, Railway Redis, or a managed Redis instance.

1. Create a Redis database in the same region as the worker when possible.
2. Enable TLS.
3. Copy the `rediss://` connection URL.
4. Add it as `REDIS_URL` in Vercel and the worker environment.
5. Confirm the worker and web app use the same Redis URL.
6. Never use an in-memory queue in production.

BullMQ requires a Redis connection with `maxRetriesPerRequest: null`, which is already configured in `src/queue.js`.

### 6. Create Cloudflare R2 storage

1. Open Cloudflare Dashboard → R2.
2. Create a bucket named `zoomcue-assets`.
3. Create an R2 API token scoped only to that bucket.
4. Copy the S3-compatible endpoint and credentials.
5. Add the R2 variables to Vercel and the worker.
6. Keep the bucket private. Generate short-lived signed download URLs from the API.

Store large assets in R2, not Vercel's filesystem and not MySQL.

### 7. Deploy the worker with Playwright and FFmpeg

Vercel cannot safely run the persistent pipeline worker. Use Railway, Render, Fly.io, or a VPS with Docker.

The repository includes `Dockerfile.worker`, which contains Chromium and its system dependencies:

```bash
docker build -f Dockerfile.worker -t zoomcue-worker .
docker run --env-file .env zoomcue-worker
```

For Railway or Render:

1. Create a new background worker service from the GitHub repository.
2. Select Docker deployment.
3. Set the Dockerfile to `Dockerfile.worker`.
4. Set the start command to:

   ```bash
   node src/pipeline-worker.js
   ```

5. Add the same MySQL, Redis, R2, encryption, and provider environment variables.
6. Set worker concurrency conservatively, starting at `1` for browser/render jobs.
7. Enable automatic restart on failure.
8. Configure health/log monitoring.

The worker must have access to:

- Chromium/Playwright
- FFmpeg
- Remotion dependencies
- MySQL
- Redis
- R2
- Provider APIs

### 8. Deploy the render worker

For larger workloads, use a second worker service instead of making the browser worker render video:

```text
pipeline worker: explore, script, dry-run, narrate, record, camera audit
render worker: Remotion composition, FFmpeg, mux, R2 upload
```

Start the render service with the rendering worker command configured in the deployment platform. Keep render concurrency at `1` initially because 1080p60 rendering is CPU and memory intensive.

### 9. Verify the production flow

Run these checks in order:

```text
1. Open https://digital360.store
2. Register a test account
3. Log in and verify the secure session cookie
4. Add a Deepgram or ElevenLabs key
5. Test the provider connection
6. Create a small 30-second video
7. Confirm a BullMQ job appears in Redis
8. Confirm the worker updates progress in MySQL
9. Confirm screenshots/audio/MP4 upload to R2
10. Confirm the final signed download URL expires
11. Confirm the 3-day retention timestamp
12. Test a failed provider call and retry behavior
13. Test an invalid/private URL and confirm SSRF rejection
14. Test an unauthenticated video lookup and confirm 401/404
15. Test rate limits and CSRF protection
```

### Vercel limitations

Do not place these inside a Vercel function:

- Playwright browser sessions
- Long page exploration
- FFmpeg rendering
- Remotion rendering
- Large file generation
- Durable queue consumers
- In-memory job state

Use Vercel only for short API requests and the web layer. Use the external worker for the long-running pipeline.

## Security checklist

- Use HTTPS and HSTS in production.
- Use secure, HTTP-only, SameSite cookies.
- Keep API keys encrypted and never log them.
- Rotate exposed keys immediately.
- Use CSRF tokens for cookie-authenticated mutations.
- Keep CORS limited to `https://digital360.store`.
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
