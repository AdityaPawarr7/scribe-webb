# Step 3 — Prototype

Live app: _add Vercel URL_ · Code: https://github.com/AdityaPawarr7/scribe-webb

## What shipped (MVP)
- **Capture:** mic recording in the browser (MediaRecorder, webm/opus). Tab audio was cut.
- **Transcribe locally:** Whisper (`Xenova/whisper-small.en`) via `@xenova/transformers`, run in a Web Worker in 30 s chunks with progress %. Audio is resampled to 16 kHz mono first. The model is cached by the browser after the first download.
- **Notes alongside the transcript:** "My notes" is editable before, during and after recording.
- **AI summary:** one `POST /api/summarize` to a Vercel Edge function that calls the Concentrate Responses API (`gpt-oss-120b`) with a server-side key. Only transcript and notes text leave the browser, never audio.
- **Meetings (CRUD):** create, list, edit, delete, in IndexedDB via Dexie. Rendered/Raw toggle for the markdown summary.
- **Reminders (CRUD):** second entity, added because of P1's feedback. Quick-add, due dates, Open/Done, edit/delete, "+ reminder" from a summary, link back to the source meeting.
- **Sample data:** seed/clear buttons, with a `sample-` id prefix so demo data never mixes with real data.
- **Guardrails:** in-memory per-IP rate limit (20/hr), dev-only API middleware, an error boundary.

## Architecture
```
Browser                                       Vercel Edge function        Concentrate API
───────                                       ────────────────────        ───────────────
mic ─► MediaRecorder ─► IndexedDB (audio)
          │
          ▼
resample 16 kHz ─► Whisper in Web Worker
          │
          ▼
transcript (IndexedDB)
          │  POST /api/summarize { transcript, notes, template }
          ├───────────────────────────────────► per-IP rate limit (in memory)
          │                                      └─► POST /responses (server-side key)
          │   ◄──────── markdown summary ◄────────────────┘
          ▼
IndexedDB (meeting) + rendered UI
```

## Cut or deferred, and why
- **Tab audio, chat with a meeting:** scope creep for v1; no strong interview signal for tab audio, and chat is the sketch I didn't pick.
- **KV-backed rate limits and a global spend cap:** planned, not built. The current limit resets on cold start and has no global cap, so the key is exposed to abuse until this exists. Mitigation for now: a free-tier model and a spend limit on the key itself.
- **Streaming transcription, diarization, accounts, sync, calendar:** out of scope.

## Build log
Short entries; details in [ai-log.md](ai-log.md).
1. **Scaffold:** Vite + React + TS + Tailwind + Dexie. AI did this in one pass.
2. **Whisper:** blank page from an eager import (`registerBackend`); fixed with lazy import.
3. **Bad transcripts:** `[S]` then `[Music]`. Root cause was no 16 kHz resample; also switched to `whisper-small.en`.
4. **Summary API:** AI assumed the wrong response shape. Switched to the Responses API and checked against docs.
5. **Deploy:** two Vercel failures (runtime config, then Fetch handler on Node). Edge runtime and try/catch fixed it.
6. **UX flow:** typed notes were lost on a new meeting. Redesigned to attach on Stop and added "+ new".
7. **Polish:** removed stray untitled meetings, markdown styling, Rendered/Raw toggle.
8. **Reminders:** built after P1's request. Fixed a type error along the way.
9. **Long-audio freeze:** moved transcription to a Web Worker (unverified on long audio).
10. **Tests and sample data:** 20 passing tests; found and fixed a "due today shows overdue" bug via seed data.

## AI reflection
- **Where AI helped:** scaffolding, schemas, CRUD, UI, tests, and fast diagnosis when I pasted exact errors or screenshots.
- **Where it was wrong:** library and platform specifics. It asserted the wrong Concentrate response shape, a bad Vercel config, and a first-guess cause for the bad transcripts. All were caught by running the code, not reading it.
- **Where it could harm (constitution):** an API key leaking into the client bundle, or an unbounded public endpoint burning spend. The key stays server-side, but the rate limit is still weak, which is the main known risk.
- **What I did about it:** every AI-written library call was run before moving on; I deliberately broke code to confirm tests fail; I cut features the research didn't support.
- **What I'd change:** give AI the API docs up front instead of letting it guess, and write the long-audio test before the worker fix rather than after.
- **Experiments:** see [ai-log.md](ai-log.md).
