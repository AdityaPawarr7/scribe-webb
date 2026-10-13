# Step 2d — Sketches

Three concept directions for Scribe. The sketches are intentionally low-fi
and hand-drawn-feel — they're for comparing *approaches*, not deciding colors.
All three solve the same root problem from §01: the attention-vs-capture
tradeoff during a lecture or crit.

Pick a sketch, click to view it, then read the compare-and-contrast at the bottom.

| | Direction | File |
|---|---|---|
| 1 | **Side-by-side** — three columns: my notes, transcript, enhanced notes | [01-side-by-side.svg](01-side-by-side.svg) |
| 2 | **Timeline-first** — scrubbable timeline with sticky notes pinned to moments | [02-timeline.svg](02-timeline.svg) |
| 3 | **Chat-with-your-meeting** — no persistent summary; ask the meeting questions on demand | [03-chat.svg](03-chat.svg) |

## Compare and contrast

| Dimension | 1 Side-by-side | 2 Timeline | 3 Chat |
|---|---|---|---|
| Builds on existing habits? | **Yes** — mirrors Notes/Docs | Partial — new mental model | **Yes for P1** (she already LLM-tutors) |
| Build cost (web, 1 week) | **Low** | Medium — needs scrubber + sticky pinning | Low–medium — needs retrieval over transcript |
| CRUD surface for the assignment | **Clear** — meetings are rows | Clear | Fuzzy — "the meeting" is the record, chat turns aren't |
| Risk of AI hallucination the user won't notice | Medium — summary looks authoritative | Medium | **High** — answers feel ad-hoc, no fixed artifact to re-read |
| Fits "clean dashboard" (P1) | Partial — depends on sidebar polish | Weak — timeline per meeting, no cross-meeting view | Weak — no persistent artifact |
| Fits "fast reference across notebooks" (P2) | **Strong** — list + search | Weak — scrubbing is per-meeting | Strong — ask across meetings |
| Local-first viable? | **Yes** | Yes | Partial — chat answers want an LLM call each time |

## Which one I picked and why

**Sketch 1 (Side-by-side)** shipped as v1 of the Scribe web port.

Three reasons:

1. **Lowest-risk CRUD mapping.** The assignment explicitly asks for 5+ CRUD operations, and `Meeting` as a row with transcript/notes/summary makes Create/Read/Update/Delete concrete without me having to invent fuzzy entities ("conversation turn", "pinned moment").
2. **Builds on existing habits.** Both participants described note-taking paradigms that side-by-side maps cleanly onto — P2 already types alongside slides, P1 already dumps to a diary after. The sketch is familiar in a way that lets the AI layer (the enhanced notes) be the interesting new thing.
3. **Doesn't commit me to a UX bet.** Timeline-first (sketch 2) is a *strong* opinion about how people review notes — scrubbing feels great in a demo but my own experience with Granola and Fireflies is that the summary gets re-read, the scrubber doesn't. Chat (sketch 3) is a bet that users will *keep asking* instead of just skim — a stronger product in a world with free LLM calls, but it hides mistakes behind confident prose, which is exactly what the GenAI constitution warns against.

**What I'd try next (post-prototype):**
- Pull one idea from each of sketches 2 and 3 into the shipped UI:
  - From sketch 2: **timestamps on sticky "my notes"** that link to the moment in the transcript, so P1's "I want to listen" style still gets anchored notes without her writing them live.
  - From sketch 3: a **"ask this meeting" box** below the enhanced notes, since P1 uses LLMs as a tutor anyway — but keep the enhanced-notes artifact as the primary record.
- Build the dashboard view P1 asked for (cross-meeting reminders + due dates).

## AI reflection
- **Where AI helped:** generating the SVG sketch files quickly so I could compare three directions on paper before committing one to code. Honestly, if I'd had to draw three polished mockups in Figma I would have built one and skipped the exploration.
- **Where it could harm (per the GenAI constitution):** AI will happily make every sketch look slick, which makes the comparison lie. A pretty mockup of a bad idea reads as "ready to build." **Mitigation:** I kept the sketches intentionally low-fi (hand-drawn feel, no color system) so none of them seduces by polish alone.
- **Risks:** letting AI *also* pick which concept wins. I wrote the compare-and-contrast reasoning myself (what fits P1 vs P2, where the GenAI constitution is uncomfortable, which CRUD mapping is clean).
- **Experiments:** see [ai-log.md](../ai-log.md).
