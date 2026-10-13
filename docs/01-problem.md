# Step 1 — Problem

## Problem statement

**When I'm actively participating in a lecture, crit, or meeting, I lose track of what was said and what I committed to.** My notes come out one of two ways:

- **Incomplete, because I was listening** — presence in the moment costs capture.
- **Missing verbal context, because I was writing** — capture costs presence.

By the time I need the notes again (a week later for exam prep, two days later for a revision, the next crit for feedback follow-through), the gap in them is the gap I care about most.

> The two interviews in [02a-interviews](02a-interviews/) found the exact same tradeoff described from opposite sides:
>
> - **P2:** writes during lectures, loses the verbal thread while copying whiteboard diagrams. Notes "do not make sense" weeks later.
> - **P1:** listens fully during crits, writes nothing live. Dumps to a paper diary after. Memory "sometimes" fails.
>
> That shared root — the attention/capture tradeoff — is what Scribe is for.

## Who has this problem

- **Students in participation-heavy classes:** lectures with concept-dense boards, studio crits, labs, discussion sections.
- **Anyone in meetings they also need to drive** — not an observer with time to type, a participant with a role to play.
- **People who revisit old sessions** before an exam, a revision round, a 1:1 follow-up, or a next crit — the ones for whom notes are a durable artifact, not a disposable task log.

Why generic transcription tools don't close the gap: a 45-minute transcript is unreadable, YouTube re-watches aren't personalized to your class, and recording-only tools still leave you re-reading the whole thing. The need isn't *more* record; it's a *trusted highlights layer* that reflects what you were trying to track.

## Alternatives that exist today — and the gaps

| Alternative | Gap for this problem |
|---|---|
| **Paper notebook / diary** (P1's status quo) | Great for in-the-moment jotting; terrible for cross-project organization. "A lot of paperwork, gets messy." |
| **Typing live into Notes/Google Docs** (P2's status quo) | Steals attention from the speaker. Weeks later the notes "do not make sense." |
| **Granola, Fireflies, Otter** | Native-app or bot-in-the-call model, often paid, send your audio to a vendor. Granola is Mac-only; the rest join your calls visibly. |
| **Zoom AI / Teams Copilot** | Vendor-locked and only works inside that platform's meetings — useless for an in-person lecture or crit. |
| **YouTube re-watches of related concepts** (P2's current fallback) | "Not personalized" — a stranger's explanation, not what *your* professor actually said. |

**Where Scribe fits** (framed by the needs in [02b-requirements.md](02b-requirements.md)):
- Transcription happens locally in the browser — nothing uploaded.
- The AI summary is a *highlights layer* over the transcript, shaped by the user's own typed notes.
- Everything stays in a single browser-local dashboard, so paperwork can't fragment.
- Works for any audio source, inside or outside a specific platform.

## Why this is worth building

- Both interviewees described the same tradeoff without being prompted.
- One of them (P1) said unprompted that she'd be comfortable with recording *if* the output were notes and the data stayed local — matching Scribe's architecture exactly.
- The CRUD operations needed to serve this problem — create a meeting from audio, read/search past meetings, edit notes and summary, delete a session — are a natural fit for the assignment's scope.

## AI reflection
- **Where AI helped or could help:** reframing my initial pitch ("open-source Granola on the web") into a *problem*, not a product. On the first turn of this project, I described the solution; AI pushed back and said that would show in my requirements. That reframe (problem first) is what made the interview questions honest. Separately, AI helped me spot that P2's "lose the train of thought" and P1's "want to listen as much as I can" are the same tradeoff from opposite sides — I had the quotes, AI stress-tested the pattern.
- **Where it could harm (per the class genAI constitution):** AI will cheerfully validate any problem statement I write. If I'd stuck with the "open-source Granola" framing, AI would have reinforced it instead of challenging it. The risk is a feedback loop where my own enthusiasm gets echoed back as "research." **Mitigation:** I framed the problem *before* the interviews, then tested it against them — the quotes in 02a either support the framing or they don't, and the framing above only earned the lines where quotes back it up.
- **Where I chose not to use AI:** picking which alternatives to compare against. I know the native note-taker landscape (I built the Electron version), so that table is from my own head.
- **Experiments:** see [ai-log.md](ai-log.md).
