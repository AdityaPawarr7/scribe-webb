// Sample data for demos and screenshots.
// EVERYTHING here is fictional — invented lecture/crit/standup content, not
// real recordings or real people. Sample rows use a "sample-" id prefix so
// they can be told apart from real data, and removed without touching it.
import { db, type Meeting, type Reminder } from './db'

export const SAMPLE_PREFIX = 'sample-'
export const isSample = (id: string) => id.startsWith(SAMPLE_PREFIX)

const HOUR = 3_600_000
const DAY = 24 * HOUR

/** 9:00 local time, `offsetDays` from today. */
function dayAt(offsetDays: number, hour = 9): number {
  const d = new Date()
  d.setHours(hour, 0, 0, 0)
  d.setDate(d.getDate() + offsetDays)
  return d.getTime()
}

function sampleMeetings(now: number): Meeting[] {
  return [
    {
      id: 'sample-m1',
      title: 'Pumping Lemma — Intro',
      createdAt: now - 3 * HOUR,
      updatedAt: now - 3 * HOUR,
      durationSec: 42 * 60,
      hasAudio: false,
      notes:
        "pumping lemma — only for regular langs\nxy ≤ p, y not empty\n- ask about Q4\n- example 2 again?",
      transcript: [
        {
          t: 0,
          text:
            "Okay, so today we're going to talk about the pumping lemma. The idea is that if a language is regular, then every sufficiently long string in it can be split into three pieces, x, y, and z. The piece y can't be empty, and the length of x and y together can't exceed the pumping length p. And crucially, if you repeat y any number of times, including zero, the string has to stay in the language. We usually use this to prove a language is not regular, by finding one string that breaks the rule. Let's walk through example two, the language with equal numbers of a's and b's. Homework four is due Friday, and question four is the tricky one, so start early."
        }
      ],
      enhancedNotes: `# Pumping Lemma — Intro

## Summary
The professor introduced the pumping lemma for regular languages: any sufficiently long string can be split into x, y, z with y non-empty and |xy| ≤ p, and pumping y must keep the string in the language. It is mainly used to prove a language is **not** regular.

## Key points
- Split rule: s = xyz, y ≠ ε, |xy| ≤ p
- Pumping y up or down (including zero times) must stay in the language
- Proof pattern: find one string that cannot be pumped

## Action items
- **Me:** Try Q4 before Friday (homework 4 due Friday)
- **Me:** Re-read example 2 (equal numbers of a's and b's)

## Open questions
- Where exactly does the proof break in the contradiction step?
`
    },
    {
      id: 'sample-m2',
      title: 'Studio Crit — Project 2 Feedback',
      createdAt: now - DAY - 2 * HOUR,
      updatedAt: now - DAY - 2 * HOUR,
      durationSec: 28 * 60,
      hasAudio: false,
      notes: 'entry sequence weak\ntoo many materials\nrevise sections — Thursday',
      transcript: [
        {
          t: 0,
          text:
            "I like the massing, but I'm not convinced by the entry sequence. Right now you arrive and there's no moment of compression before the main space opens up. The material palette is also doing too much. I count five different finishes in the main room, so try cutting it back to two or three. And bring revised section drawings to Thursday. I want to see how the light moves through the stair."
        }
      ],
      enhancedNotes: `# Studio Crit — Project 2 Feedback

## Summary
Positive on the overall massing. Main concerns: the entry sequence lacks a compressed moment before the main space, and the material palette is too busy.

## Feedback
- **Entry sequence:** add compression before the main space opens up
- **Materials:** five finishes in the main room — reduce to two or three
- **Light:** show how daylight moves through the stair

## Action items
- **Me:** Revise section drawings and bring them to Thursday's crit
- **Me:** Cut the material palette to two or three finishes
`
    },
    {
      id: 'sample-m3',
      title: '1:1 with Advisor — Thesis Scope',
      createdAt: now - 2 * DAY,
      updatedAt: now - 2 * DAY,
      durationSec: 18 * 60,
      hasAudio: false,
      notes: 'scope too broad → one case study\noutline by Monday',
      transcript: [
        {
          t: 0,
          text:
            "My main worry is that the scope is still too broad. I'd rather see one case study done well than three done thinly. Pick the one where you have the best access to data. Then send me a revised outline by Monday and we'll go from there."
        }
      ],
      enhancedNotes: `# 1:1 with Advisor — Thesis Scope

## Summary
The advisor feels the thesis scope is still too broad and recommends narrowing to a single case study — the one with the best data access.

## Decisions
- Narrow to **one** case study

## Action items
- **Me:** Send the advisor a revised outline by Monday
`
    },
    {
      id: 'sample-m4',
      title: 'Senior Design Standup',
      createdAt: now - 3 * DAY,
      updatedAt: now - 3 * DAY,
      durationSec: 11 * 60,
      hasAudio: false,
      notes: '',
      transcript: [
        {
          t: 0,
          text:
            "Quick updates. The sensor board is working on the bench but we haven't tested it in the enclosure yet. The main blocker is that we still haven't agreed on the API contract between the app and the device, so we should lock that down this week."
        }
      ],
      enhancedNotes: `# Senior Design Standup

## Summary
Sensor board works on the bench but is untested in the enclosure. The API contract between app and device is still undecided and is the main blocker.

## Action items
- **Team:** Agree the API contract this week
- **Hardware:** Test the sensor board inside the enclosure
`
    }
  ]
}

function sampleReminders(now: number): Reminder[] {
  const base = { createdAt: now, updatedAt: now }
  return [
    { ...base, id: 'sample-r1', text: 'Try Q4 before Friday', dueAt: dayAt(2), done: false, meetingId: 'sample-m1' },
    { ...base, id: 'sample-r2', text: "Bring revised section drawings to Thursday's crit", dueAt: dayAt(0), done: false, meetingId: 'sample-m2' },
    { ...base, id: 'sample-r3', text: 'Send advisor the revised thesis outline', dueAt: dayAt(-1), done: false, meetingId: 'sample-m3' },
    { ...base, id: 'sample-r4', text: 'Look up a second proof of the pumping lemma', dueAt: null, done: false, meetingId: 'sample-m1' },
    { ...base, id: 'sample-r5', text: 'Agree the API contract with the team', dueAt: dayAt(-2), done: true, meetingId: 'sample-m4' }
  ]
}

/** Adds sample rows that aren't already there. Never overwrites existing rows. */
export async function seedSampleData(): Promise<{ meetings: number; reminders: number }> {
  const now = Date.now()
  let meetings = 0
  let reminders = 0
  for (const m of sampleMeetings(now)) {
    if (!(await db.meetings.get(m.id))) { await db.meetings.add(m); meetings++ }
  }
  for (const r of sampleReminders(now)) {
    if (!(await db.reminders.get(r.id))) { await db.reminders.add(r); reminders++ }
  }
  return { meetings, reminders }
}

/** Removes ONLY sample rows (id prefix "sample-"). Real data is untouched. */
export async function clearSampleData(): Promise<{ meetings: number; reminders: number }> {
  const meetings = await db.meetings.where('id').startsWith(SAMPLE_PREFIX).delete()
  await db.audio.where('id').startsWith(SAMPLE_PREFIX).delete()
  const reminders = await db.reminders.where('id').startsWith(SAMPLE_PREFIX).delete()
  return { meetings, reminders }
}
