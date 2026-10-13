# Scribe — a local-first AI meeting notepad (web)

An open-source, browser-based take on AI meeting notes. It records your mic, transcribes **on your device** with Whisper, and sends only the transcript text to an LLM for a summary.

Companion web port of the native app [AdityaPawarr7/scribe](https://github.com/AdityaPawarr7/scribe) (which I built earlier). Built for *Applied AI Tools — Project 1: Human-guided software development*.

**Live demo:** _add Vercel URL_ · **Demo video (1–3 min):** _add link_ · **Code:** this repo

> **Disclosure:** I work at Concentrate AI. Scribe uses the Concentrate API for model access.

---

## The problem
When I'm actively participating in a lecture, studio crit or meeting, I lose track of what was said and what I committed to. Listening costs capture; writing costs presence. In two interviews, one student described writing live and losing the verbal thread, and the other described listening fully and forgetting afterwards: the same tradeoff from opposite sides. Both also said their notes end up scattered across notebooks, and one asked unprompted for reminders.

Full write-up: [docs/01-problem.md](docs/01-problem.md).

## What Scribe does
- **Record** a meeting or lecture from your mic while you type rough notes alongside.
- **Transcribe locally** in the browser with Whisper (`whisper-small.en`). Audio never leaves your device.
- **Enhance** your notes: one click sends the transcript and your notes to an LLM and returns a titled markdown summary with action items.
- **Keep everything organised:** meetings and reminders are stored in your browser (IndexedDB). Turn an action item into a reminder with "+ reminder", and each reminder links back to its meeting.
- **Try it with sample data:** a seed button loads fictional meetings and reminders, clearly badged SAMPLE, and clears them again without touching your real data.

## Screenshots
_Add 4–6 images to `docs/screenshots/` and link them here._

| | |
|---|---|
| Meeting view: my notes, transcript, enhanced notes | _screenshot_ |
| Recording and transcribing (progress %) | _screenshot_ |
| Reminders dashboard | _screenshot_ |
| Sample data loaded | _screenshot_ |

## How to use it
1. Open the live demo in Chrome or Edge and click **+ new**.
2. Type rough notes if you like, then click **Record** and allow the mic.
3. Click **Stop**. The first time, the Whisper model downloads (a one-off, cached by the browser), then the transcript appears with a progress indicator.
4. The enhanced notes appear automatically. Toggle **Rendered / Raw** to see the markdown.
5. Use **+ reminder** on an action item, and manage everything under the **Reminders** tab.
6. No microphone handy? Use the **sample data** buttons in the sidebar.

## How it works
Local-first: audio is captured and transcribed in the browser. Only text crosses the network, and only when a summary is generated.

```
Browser                                       Vercel Edge function        Concentrate API
───────                                       ────────────────────        ───────────────
mic ─► MediaRecorder ─► IndexedDB (audio)
          │
          ▼
resample 16 kHz ─► Whisper in a Web Worker (30 s chunks)
          │
          ▼
transcript (IndexedDB)
          │  POST /api/summarize { transcript, notes, template }
          ├───────────────────────────────────► per-IP rate limit
          │                                      └─► POST /responses (server-side key)
          │   ◄──────── markdown summary ◄────────────────┘
          ▼
IndexedDB (meeting) + rendered UI
```

**Stack:** Vite, React 18, TypeScript, Tailwind, Dexie (IndexedDB), `@xenova/transformers`, `react-markdown`, Vitest, Vercel. The API key lives only in a server-side environment variable.

## Known limitations
- **Rate limiting is basic.** A per-IP limit (20/hour) held in memory. It resets on cold starts and there is no global spend cap yet. The model is a free-tier one and the key has its own spend limit as a stopgap. A KV-backed limit and cap are the next job.
- **Mic only.** Tab audio (for Meet/Zoom in a browser) was cut from v1.
- **Long recordings** are transcribed in a Web Worker so the UI stays responsive, but this has not yet been verified on a long recording (see [docs/04-testing.md](docs/04-testing.md)).
- Chrome or Edge on a laptop is the tested target. The first transcription downloads the model.

## What I'd do next
Chat with a meeting, tab-audio capture, KV rate limits with a global cap, auto-delete audio after transcription, export/backup.

---

## The process, step by step
Every step has its own doc with a GenAI reflection.

| Step | Doc |
|---|---|
| 1. Problem | [docs/01-problem.md](docs/01-problem.md) |
| 2a. Interviews | [docs/02a-interviews/](docs/02a-interviews/) |
| 2b. Needs, user stories, requirements | [docs/02b-requirements.md](docs/02b-requirements.md) |
| 2c. Technical research (plan vs. what shipped) | [docs/02c-research.md](docs/02c-research.md) |
| 2d. Sketches | [docs/02d-sketches/](docs/02d-sketches/) |
| 3. Prototype and build log | [docs/03-prototype.md](docs/03-prototype.md) |
| 4. Testing, feedback, deploy | [docs/04-testing.md](docs/04-testing.md) |
| **GenAI experiment log** | [docs/ai-log.md](docs/ai-log.md) |
| **Takeaways / protocol for others** | [docs/protocol.md](docs/protocol.md) |

## GenAI experiments: what worked and what didn't
Full detail, with 17 logged interactions, is in [docs/ai-log.md](docs/ai-log.md).

**Worked well:** scaffolding, schemas, CRUD, UI, tests, and fast diagnosis whenever I pasted the exact console error or a screenshot. Using AI to pressure-test my first pitch (it pointed out I'd described a solution, not a problem) improved the interview questions.

**Didn't work:** library and platform specifics. The AI assumed the wrong Concentrate response shape, a bad Vercel runtime config, and misdiagnosed the first bad transcripts as a model-size problem when the audio was never resampled to 16 kHz. Every one of these was caught by running the code, not by reading it.

**What I did about it:** ran every AI-written library call before moving on, deliberately broke code to confirm the 20 tests can fail, and cut features the interviews didn't support.

## Running locally
```bash
npm install
cp .env.example .env.local   # set CONCENTRATE_API_KEY (server-only; never prefix with VITE_)
npm run dev                  # http://localhost:5173, /api/summarize is served by a dev middleware
npm test                     # 20 data-layer tests
npm run build
```
Deploy: import the repo into Vercel and set `CONCENTRATE_API_KEY` (optionally `CONCENTRATE_BASE_URL` and `CONCENTRATE_MODEL`).

## Privacy
Audio stays in your browser. The transcript and your notes are sent to the server only when a summary is generated, and Scribe does not store them (they are passed to the Concentrate API to produce the summary). Meetings are kept in your browser's IndexedDB; clearing site data removes them.
