# Signal — narrated walkthroughs

A polished, interactive front-end prototype for the AI screen-recording platform described in the product brief.

## Included in this prototype
- Screen 1: new video form with exact starter brief library, honesty copy, voice/writer selection, word captions, Look controls, estimate card, API keys modal, and extension modal.
- Script pipeline simulation: Explore → Write → Dry-run with live per-beat audit lines.
- Script review screen with page snapshot mock, checks, narration beats, revision affordance.
- Recording/rendering simulation with Narrate / Record / Camera audit / Render progress.
- Final video page mock with audit sheet, retention notice, source URL and verbatim brief trail.
- Manifest V3 companion extension scaffold with `ssv:fetch-page` and `ssv:sign-in` message jobs.

## Run
```bash
python3 -m http.server 4173
```
Then open the live preview. This is intentionally dependency-free so the interaction prototype can be reviewed immediately.

## Production architecture notes
The production build should lift this UI into Laravel 11 + Postgres, use encrypted BYOK rows and Horizon/Redis job status, and put Playwright + Remotion in a Node 20 BullMQ worker. The browser-side timeline should remain a shared JSON contract between preview and Remotion render; the extension's storageState output should be encrypted, job-scoped and deleted after recording.
