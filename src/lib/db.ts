// Local-first storage. All meetings live in the browser.
// Mirrors the Meeting shape from the Electron app's shared/types.ts
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

class ScribeDB extends Dexie {
  meetings!: Table<Meeting, string>
  audio!: Table<{ id: string; blob: Blob }, string>
  constructor() {
    super('scribe')
    this.version(1).stores({
      meetings: 'id, createdAt, updatedAt, title',
      audio: 'id'
    })
  }
}
export const db = new ScribeDB()

export const makeId = () => (crypto.randomUUID?.() ?? String(Date.now()))

export async function createMeeting(): Promise<Meeting> {
  const now = Date.now()
  const m: Meeting = {
    id: makeId(),
    title: 'Untitled meeting',
    createdAt: now,
    updatedAt: now,
    notes: '',
    transcript: [],
    enhancedNotes: '',
    durationSec: 0,
    hasAudio: false
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
}
