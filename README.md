# Scribe (web) — Vercel-deployable prototype

Companion web port of [AdityaPawarr7/scribe](https://github.com/AdityaPawarr7/scribe).
The native repo stays the source of truth for architecture and types; this folder is the browser build that runs on Vercel for the class demo.

## What's different vs the native app

| Native (Electron) | Web (this folder) |
|---|---|
| whisper.cpp binary | `@xenova/transformers` Whisper (WebGPU, WASM fallback) |
| System audio via ScreenCaptureKit | Mic (and later, optional tab audio via `getDisplayMedia`) |
| Concentrate call from Electron main (user's own key) | Call via `/api/summarize` serverless function (server-side key, rate limited) |
| JSON + WAV files on disk | IndexedDB (meetings + audio blobs) via Dexie |

## Run locally
```bash
cd app-web
cp .env.example .env
# fill CONCENTRATE_API_KEY
npm install
npm run dev
```
Open http://localhost:5173, grant mic access, hit **Record**.

## Deploy to Vercel
```bash
npx vercel link   # once
npx vercel env add CONCENTRATE_API_KEY     # paste the key when prompted
npx vercel deploy --prod
```
The key only ever lives in Vercel's env store. The build output never contains it.
Grep check before any public URL goes live:
```bash
npm run build && grep -R "sk-cn" dist/ && echo "LEAK" || echo "clean"
```

## MVP scope (what's in this commit)
- Record (mic) → stop → local Whisper → summary via Concentrate
- Create / Read / Update / Delete meetings; templates data layer is ready, UI next
- All stored in IndexedDB; nothing but the transcript text ever leaves the device

## Not yet
- Tab-audio capture (Chrome `getDisplayMedia`)
- Templates CRUD UI
- VAD on silence to avoid Whisper hallucinations
- Live transcription (streaming) — v2
