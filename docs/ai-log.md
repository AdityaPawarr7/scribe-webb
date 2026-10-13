# AI Experiment Log

Log every meaningful AI interaction (good or bad) as you go. This becomes the raw data for the report.

| # | Date | Step | Tool (chat / IDE / other) | Approach & prompt (short) | Result | Worked? | Notes / what I'd change |
|---|---|---|---|---|---|---|---|
| 1 | 2026-10-12 | 1 | Claude (Cowork chat) | Pitched "open-source Granola as a web app with a capped API key" and asked for feedback | Flagged that this framed a solution, not a problem; flagged browser audio limits and the risk of exposing a key client-side | ✅ | It pushed back instead of just agreeing, which was useful |
| 1 | 2026-10-12 | 1 | Claude (Cowork chat) | Pitched "open-source Granola as a web app with a capped API key" and asked for feedback | Flagged that this framed a solution, not a problem; flagged browser audio limits and the risk of exposing a key client-side | ✅ | It pushed back instead of just agreeing, which was useful |
| 2 | 2026-10-12 | 2a | Claude (Cowork chat) | Asked it to draft interview questions and a project structure | First draft of interview-guide.md with a coverage map and a "don't say" list | ⏳ | TODO: review the questions myself against the 3 rules; note what I changed and why |
| 3 | 2026-10-13 | 3 | Claude (Cowork chat) | Asked for requirements/stories from the interviews, then what I'd missed | Surfaced P1's unprompted reminders request (raised twice) as a gap; proposed a v1 vs deferred split | ✅ | Evidence-driven: reminders became the 2nd entity. Chat and tab-audio cut as scope creep |
| 4 | 2026-10-13 | 2d | Claude (Cowork chat) | Asked for three sketches (side-by-side, timeline, chat) and a compare/contrast | 3 SVGs plus reasoning for picking side-by-side | ✅ | Rough, but enough to argue from. I made the final pick |
| 5 | 2026-10-13 | 3 | Claude (Cowork chat) | Asked it to scaffold Vite+React+TS+Tailwind+Dexie and the record flow | Working scaffold, mic recording and IndexedDB storage on first pass | ✅ | Boilerplate is where it's fastest |
| 6 | 2026-10-13 | 3 | Claude (Cowork chat) | Wired in `@xenova/transformers` Whisper | Blank page: `Cannot read properties of undefined (reading 'registerBackend')` | ❌→✅ | Eager import breaks under Vite dev. Fix: lazy `import()` + `optimizeDeps.include`. Lesson: paste the exact console error |
| 7 | 2026-10-13 | 3 | Claude (Cowork chat) | Transcripts came back as `[S] [S] …`, then `[Music]` | Real cause: audio not resampled to 16 kHz. Added OfflineAudioContext resample, pinned English, moved to `whisper-small.en` | ❌→✅ | Its first guess (model size) was only half right; the sample rate was the real bug |
| 8 | 2026-10-13 | 3 | Claude (Cowork chat) | Wrote `/api/summarize` calling Concentrate | 404, then wrong response shape. It had assumed chat-completions; the API uses the Responses API (`output[].content[].text`) | ❌→✅ | Hallucinated API shape. Fixed against the docs. Added a Vite dev middleware so `npm run dev` serves `/api` |
| 9 | 2026-10-13 | 3 | Claude (Cowork chat) | Deployed to Vercel | Two failures: invalid `runtime` in vercel.json, then FUNCTION_INVOCATION_FAILED (Fetch-style handler on the Node runtime) | ❌→✅ | Fix: `runtime: 'edge'` plus a try/catch that returns the error. I couldn't have decoded the 500 alone |
| 10 | 2026-10-13 | 3 | Claude (Cowork chat) | Reported 'empty tab after Stop' and 'can't type notes in a new meeting' | Flow changed: attach to the open meeting or create on Stop; added '+ new' | ✅ | My UX complaint, its fix. Its first design would have lost typed notes |
| 11 | 2026-10-13 | 3 | Claude (Cowork chat) | Said the UI freezes on long audio | Whisper moved into a Web Worker, 30 s chunks, progress % | ⏳ | Built, not yet verified on a long recording; see manual step in 04-testing.md |
| 12 | 2026-10-13 | 3 | Claude (Cowork chat) | Asked for reminders CRUD plus dashboard | RemindersView: quick-add, Open/Done, edit/delete, backlink to meeting | ❌→✅ | Type error (useLiveQuery returned a PromiseExtended); rewritten as an async function |
| 13 | 2026-10-13 | 4 | Claude (Cowork chat) | Asked for CRUD tests and sample data | 20 Vitest tests (fake-indexeddb) plus seed/clear sample data | ✅ | ERESOLVE conflict fixed by pinning vitest@^2.1.9 |
| 14 | 2026-10-13 | 4 | Claude (Cowork chat) | Checked the tests can actually fail | Deliberately broke code; M-D1 and R-R2 failed, then reverted | ✅ | A passing suite means little until you've seen it fail |
| 15 | 2026-10-13 | 4 | Claude (Cowork chat) | Seeded a reminder due today; it showed 'overdue' after 9 am | Fixed `dueLabel`: overdue means before the start of today | ✅ | Found by realistic sample data, not by the tests. TODO: add a test |
| 16 | 2026-10-13 | 3 | Claude (Cowork chat) | Cloud file tool used for docs I expected in my folder | Research doc never reached my machine; restored via explicit copy | ❌→✅ | Tooling mix-up, not a model error, but it cost a step. Verify files on disk after writing |

## Patterns so far

- **Fast and right:** boilerplate, schemas, CRUD, tests, UI layout.
- **Confidently wrong:** library/API specifics (Concentrate response shape, runtime config, browser audio details). Every one of these was caught by running it, never by reading it.
- **Diagnosis needs the exact error.** Screenshots of the console got fixes in one turn; descriptions like 'nothing shows up' did not.
- **Human value-add:** deciding what to cut (chat, tab audio), noticing UX flaws, and insisting on realistic data and tests that can fail.
