# Step 4 — Test and Deploy

## 1. Automated CRUD tests

**Where:** [`src/lib/db.test.ts`](../src/lib/db.test.ts) · **Run:** `npm test`
**Stack:** Vitest + `fake-indexeddb`, so the real Dexie data layer runs in Node with no browser.
**Result of the last run:** ✅ **20 / 20 passed** (about 1.3 s).

| ID | Entity | Op | What it checks | Requirement | Result |
|---|---|---|---|---|---|
| M-C1 | Meeting | **C** | New meeting has sensible defaults and is persisted | R2 | ✅ |
| M-C2 | Meeting | **C** | Every meeting gets a unique id | R2 | ✅ |
| M-R1 | Meeting | **R** | List is newest-first | R4 | ✅ |
| M-R2 | Meeting | **R** | Empty database returns an empty list | R4 | ✅ |
| M-U1 | Meeting | **U** | Patch changes only the given fields and bumps `updatedAt` | R5 | ✅ |
| M-U2 | Meeting | **U** | User notes and AI summary can be edited independently | R5 | ✅ |
| M-D1 | Meeting | **D** | Deleting a meeting also deletes its stored audio | R6, R11 | ✅ |
| M-D2 | Meeting | **D** | Deleting a missing id does not throw | R6 | ✅ |
| M-D3 | Meeting | **D** | Reminders pointing at a deleted meeting are kept (documents current behaviour) | R6, R9 | ✅ |
| R-C1 | Reminder | **C** | Defaults: open, no due date, no meeting | R7 | ✅ |
| R-C2 | Reminder | **C** | Stores a due date and a link back to its meeting | R7 | ✅ |
| R-R1 | Reminder | **R** | List splits into pending and done | R7–R9 | ✅ |
| R-R2 | Reminder | **R** | Pending sorted soonest-due first, undated last | R7–R9 | ✅ |
| R-U1 | Reminder | **U** | Marking done moves it to Done (and back) | R8 | ✅ |
| R-U2 | Reminder | **U** | Edit text and due date; due date can be cleared | R8 | ✅ |
| R-D1 | Reminder | **D** | Deletes only the chosen reminder | R9 | ✅ |
| S-1 | Sample data | — | Seeding adds meetings and reminders with valid backlinks | demo | ✅ |
| S-2 | Sample data | — | Seeding twice does not duplicate | demo | ✅ |
| S-3 | Sample data | — | Re-seeding never overwrites edits to a sample meeting | demo | ✅ |
| S-4 | Sample data | **D** | Clearing sample data removes only sample rows, never the user's own | demo, R6 | ✅ |

All four of Create, Read, Update, and Delete are covered on **both** entities (Meeting and Reminder).

### Do these tests actually catch bugs?
Tests I wrote against code I also wrote can pass for the wrong reasons, so I broke the code on purpose and checked that the tests noticed:

| Deliberate bug | Test that caught it |
|---|---|
| `deleteMeeting` no longer deletes the audio blob | M-D1 failed ✅ |
| Reminders sorted latest-due-first instead of soonest-first | R-R2 failed ✅ |

Both bugs were reverted afterwards, and the full suite is back to 20 / 20.

### Other checks run
- `npm run typecheck` — clean.
- `npm run build` — succeeds.
- **Key-leak check:** `grep -R "sk-cn\|CONCENTRATE_API_KEY" dist/` on the production build — **clean** (supports R10).

### What the automated tests do not cover
They test the data layer only. Not covered: the UI, microphone recording, in-browser Whisper, the `/api/summarize` call, and rate limiting. Those need a real browser, so they are in the manual checklist below.

## 2. Manual test checklist (run on the deployed URL)

_Not yet run. Fill in the Result column after trying each on the live site._

| # | Steps | Expected | Req | Result |
|---|---|---|---|---|
| T1 | Click Record, talk for ~15 s, click Stop | Meeting appears; transcript fills in locally | R1 | ☐ |
| T2 | Same, with notes typed beforehand in a meeting opened via "+ new" | Summary reflects the typed notes; notes are kept | R1, R5 | ☐ |
| T3 | Wait for the summary after T1 | Enhanced notes render with title, summary, action items; sidebar shows the AI title | R3 | ☐ |
| T4 | Edit the Enhanced notes (Raw tab), refresh the page | Edit persists | R5 | ☐ |
| T5 | Delete a meeting | Gone from the sidebar and after refresh | R6 | ☐ |
| T6 | Reminders tab: add one with a due date | Appears under Open | R7 | ☐ |
| T7 | Tick it, then edit another one's text and date | Moves to Done; edit persists | R8 | ☐ |
| T8 | Delete a reminder | Gone | R9 | ☐ |
| T9 | On a meeting, click "+ reminder" | Reminder created with a "from <meeting>" link | R7 | ☐ |
| T10 | "Load sample data", then "Clear sample data" | Samples appear with a SAMPLE badge, then vanish; your own data stays | demo | ☐ |
| T11 | Open DevTools → Network while recording and transcribing | No audio is uploaded; only `/api/summarize` carries text | R11 | ☐ |
| T12 | Record a long clip (5+ min) | UI stays responsive; progress % updates | usability | ☐ |

## 3. Participant feedback

_To do: send the deployed URL to P1 or P2, watch or ask them to try it, and record their reaction here (anonymized, with direct quotes)._

- **Participant:** P1 / P2
- **What they tried:**
- **What they said:**
- **What I changed or would change because of it:**

## 4. Deployment

- **Live URL:** _TBD (paste the Vercel URL)_
- **Hosting:** Vercel — static build plus an Edge function (`api/summarize.ts`)
- **Secret handling:** `CONCENTRATE_API_KEY` lives only in Vercel's environment variables; the key-leak check above confirms it is not in the shipped bundle.
- **Abuse limits today:** in-memory per-IP limit (20 summaries/hour per instance). **Known gap:** it resets on cold starts and is not shared across instances, and there is no global spend cap yet. Fine for a class demo, not for real traffic; the planned fix is Vercel KV counters (see [02c-research.md](02c-research.md)).

## AI reflection

- **Where AI helped:** writing the 20 tests, the seed data, and the checklist quickly. Generating fictional sample meetings by hand would have taken longer than the rest of this step.
- **Where it could harm (per the class genAI constitution):** AI-written tests of AI-written code share the same blind spots. They pass because they encode the same assumptions the code was built on. Green checkmarks can look like verification when they are really an echo. **Mitigation:** the deliberate-breakage check above, plus keeping an honest "not covered" list instead of implying the data-layer tests prove the whole app works.
- **Also relevant:** the sample data is entirely invented. It is labeled SAMPLE in the UI, uses a separate id prefix, and can be removed without touching real data, so it can't be mistaken for real recordings or real people.
- **What worked:** asking AI for tests *and* asking it to try to break them. The mutation check took about a minute and was the most informative part.
- **What didn't:** AI picked the newest `vitest` without checking it against the project's older Vite, which caused a dependency conflict; pinning a compatible version fixed it. While building the seed data it also surfaced a real bug in earlier AI-written code — a reminder due *today* was shown as "overdue" after 9 am — which no test had caught because the UI isn't covered by the automated tests.
- **Where I chose not to use AI:** running the manual checklist and getting participant feedback. Those are the parts that tell me whether it actually works for a person, so they have to be done by a person.
- **Experiments:** see [ai-log.md](ai-log.md).
