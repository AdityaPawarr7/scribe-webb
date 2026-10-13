// Local-first storage. All data lives in the browser.
import Dexie, { type Table } from 'dexie'

export interface TranscriptSegment { t: number; text: string }
export interface Meeting {
  id: string
  title: string
  createdAt: number
  updatedAt: number
  notes: string
  transcript: TranscriptSegment[]
  enhancedNotes: string
  durationSec: number
  hasAudio: boolean
}

export interface Reminder {
  id: string
  text: string
  dueAt: number | null  // epoch ms; null = no due date
  done: boolean
  meetingId: string | null  // link back to the meeting it came from, if any
  createdAt: number
  updatedAt: number
}

class ScribeDB extends Dexie {
  meetings!: Table<Meeting, string>
  audio!: Table<{ id: string; blob: Blob }, string>
  reminders!: Table<Reminder, string>
  constructor() {
    super('scribe')
    // v1 schema (meetings + audio) is still live;
    // v2 adds reminders without migrating existing rows.
    this.version(1).stores({
      meetings: 'id, createdAt, updatedAt, title',
      audio: 'id'
    })
    this.version(2).stores({
      meetings: 'id, createdAt, updatedAt, title',
      audio: 'id',
      reminders: 'id, createdAt, dueAt, done, meetingId'
    })
  }
}
export const db = new ScribeDB()

export const makeId = () => (crypto.randomUUID?.() ?? String(Date.now()))

/* ───── Meeting CRUD ───── */
export async function createMeeting(): Promise<Meeting> {
  const now = Date.now()
  const m: Meeting = {
    id: makeId(),
    title: 'Untitled meeting',
    createdAt: now, updatedAt: now,
    notes: '', transcript: [], enhancedNotes: '',
    durationSec: 0, hasAudio: false
  }
  await db.meetings.add(m)
  return m
}
export async function listMeetings() {
  return db.meetings.orderBy('createdAt').reverse().toArray()
}
export async function updateMeeting(id: string, patch: Partial<Meeting>) {
  await db.meetings.update(id, { ...patch, updatedAt: Date.now() })
}
export async function deleteMeeting(id: string) {
  await Promise.all([db.meetings.delete(id), db.audio.delete(id)])
  // orphan reminders stay — the meeting link just becomes dangling
}

/* ───── Reminder CRUD ───── */
export async function createReminder(partial: {
  text: string
  dueAt?: number | null
  meetingId?: string | null
}): Promise<Reminder> {
  const now = Date.now()
  const r: Reminder = {
    id: makeId(),
    text: partial.text,
    dueAt: partial.dueAt ?? null,
    done: false,
    meetingId: partial.meetingId ?? null,
    createdAt: now, updatedAt: now
  }
  await db.reminders.add(r)
  return r
}
export async function listReminders() {
  // not-done first (sorted by due date), then done at the bottom
  const all = await db.reminders.orderBy('createdAt').reverse().toArray()
  const pending = all.filter((r) => !r.done).sort((a, b) => {
    // things with a due date, soonest first; no-due at the bottom of pending
    if (a.dueAt == null && b.dueAt == null) return b.createdAt - a.createdAt
    if (a.dueAt == null) return 1
    if (b.dueAt == null) return -1
    return a.dueAt - b.dueAt
  })
  const done = all.filter((r) => r.done)
  return { pending, done }
}
export async function updateReminder(id: string, patch: Partial<Reminder>) {
  await db.reminders.update(id, { ...patch, updatedAt: Date.now() })
}
export async function deleteReminder(id: string) {
  await db.reminders.delete(id)
}
