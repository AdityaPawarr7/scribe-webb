# Step 2b — Needs, User Stories, Requirements

> **Status:** finalized against both interviews (P1, P2).

## From the interviews — the pattern

Both participants described the *same root problem* in opposite ways:

> **During a lecture or crit, paying attention to the speaker and capturing what they say at the same time is impossible.**

- **P2 (CS, lecture-heavy):** writes during, loses the verbal thread while copying whiteboard diagrams, notes don't make sense weeks later, material gets scattered across notebooks.
- **P1 (Design, studio-based):** doesn't write at all, listens fully, dumps to paper after from memory — and memory "sometimes" fails. Paper diary works for *capturing* once she sits down, but organizing everything across projects is messy.

Shared downstream pain: **neither can trust what they end up with as the record.** They either lose detail live (P2) or lose detail to memory later (P1).

Beyond that root, each surfaced something the other didn't:
- **P2:** fragmented across notebooks → "would love to just have a reference as soon as possible."
- **P1:** needs the system to **remind her** of what came out of each crit — twice, unprompted — and wants a **clean dashboard** across the mess of paperwork.

## 5 user needs

| # | Need | Primary evidence |
|---|---|---|
| N1 | Capture what's said without stealing attention from the speaker | P2: "Copying it down, but then I lose the train of thought for a second." · P1: "I want to listen as much as I can." |
| N2 | A single, searchable dashboard across every class, project, and crit | P2: "It gets split into different notebooks… would love to just have a reference as soon as possible." · P1: "It's a lot of paperwork so it gets messy and a clean dashboard… would be awesome." |
| N3 | Notes that still make sense weeks later — highlights, not raw playback | P2: "It does not make sense" (on exam-prep review) · P1: "I don't want to walk through the recording — I rather get the most important points from it." |
| N4 | Reminders for the things that were committed to during a session | P1: "A note system that can send reminders too" and "a clean dashboard to organize reminders would be awesome" |
| N5 | Privacy by default — recording is OK only if the output is notes and the data stays local | P1: "Not really [uncomfortable], if it was notes and local." · Negative constraint from the GenAI constitution — do no harm with others' speech. |

## 7 user stories

1. **As a student, I want to record a lecture or crit and get a transcript on-device, so that I can stay present with the speaker instead of splitting my attention.** *(N1, N5)*
2. **As a student, I want to add my own notes alongside the recording, so that the record reflects what mattered to me — not just what was said.** *(N1, N3)*
3. **As a student, I want an AI-generated summary with action items that still reads cleanly weeks later, so that older meetings don't become dead weight.** *(N3)*
4. **As a student, I want to edit the AI summary, so that I can fix anything the model got wrong before I trust it.** *(N3)*
5. **As a student, I want a searchable list of all my meetings across classes and projects, so that I can pull up "what the prof said about X" in one place.** *(N2)*
6. **As a student, I want to turn action items from a meeting into reminders with a due date, so that commitments don't slip once the meeting ends.** *(N4)*
7. **As a student, I want to delete a meeting or a reminder, so that nothing I don't want kept sticks around.** *(N5)*

## Requirements ("Application must…")

Each requirement maps to at least one story and names its CRUD operation.
We have **two entities** — `Meeting` and `Reminder` — and the five CRUD operations are covered across both.

| # | Requirement | Entity | CRUD | Story |
|---|---|---|---|---|
| R1 | Record audio from the mic and transcribe it on-device via in-browser Whisper. | Meeting | **C** | US1 |
| R2 | Store each meeting (audio, transcript, user notes, enhanced notes) in IndexedDB. | Meeting | **C** | US1, US2 |
| R3 | Display a selected meeting with transcript, user notes, and enhanced notes side by side. | Meeting | **R** | US1, US3 |
| R4 | List and search all stored meetings. | Meeting | **R** | US5 |
| R5 | Let the user edit both the user-notes field and the AI summary field after recording. | Meeting | **U** | US2, US4 |
| R6 | Let the user delete a meeting and its audio from local storage. | Meeting | **D** | US7 |
| R7 | Let the user create reminders from a meeting (name, due date, source meeting). | Reminder | **C** | US6 |
| R8 | Let the user mark a reminder complete or edit its text/date. | Reminder | **U** | US6 |
| R9 | Let the user delete a reminder. | Reminder | **D** | US7 |
| R10 | The Concentrate API key never ships to the browser; summarization goes through a server function with rate limits and a spend cap. | — | — | security |
| R11 | Audio must never leave the device unless the user explicitly exports it. Transcription runs locally. | — | — | privacy (N5) |

CRUD coverage: **C** (R1/R2/R7), **R** (R3/R4), **U** (R5/R8), **D** (R6/R9) — all five of the "C, R, U, D" plus the privacy/security constraints the interviews surfaced.

## What's in v1 of the prototype vs what's planned

| | In v1 (shipped) | Deferred (post-prototype) |
|---|---|---|
| Meetings | C, R, U, D | — |
| Reminders | — | C, U, D (US6, R7–R9) |
| Dashboard | per-meeting view + sidebar list + search | cross-project dashboard view (R4 extension) |

Reminders are the clearest post-MVP addition: they came from P1 alone, so building them before validating with P1 would have been risky. Now that the signal is strong (she raised it twice unprompted), they're on the roadmap and will be noted as "evidence-driven next step" in the write-up.

## AI reflection
- **Where AI helped:** turning raw quotes into needs; mapping stories to CRUD operations; spotting the "attention vs capture" root pattern across the two interviews. The pattern itself is my call, but AI stress-tested the framing.
- **Where it could harm (per the class genAI constitution):** AI tends to over-generalize from thin data. Two interviews is thin. If I let AI write a crisp story like "all students want reminders," I'd be laundering P1's single voice into a universal claim. **Mitigation:** every need carries at least one direct quote; needs with only one source (N4) are labeled "P1 unique."
- **Where I chose not to use AI:** deciding **which** unique signals to carry into v1 vs defer. That's a judgment call about scope, not a research question — AI's instinct is to include everything.
- **Experiments:** see [ai-log.md](ai-log.md).
