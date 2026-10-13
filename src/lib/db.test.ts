// CRUD test set for Scribe web's local data layer (IndexedDB via Dexie).
// Runs in Node against fake-indexeddb, so no browser is needed.
// Test IDs (M-*, R-*, S-*) match docs/04-testing.md.
import 'fake-indexeddb/auto'
import { beforeEach, describe, expect, it } from 'vitest'
import {
  db,
  createMeeting,
  listMeetings,
  updateMeeting,
  deleteMeeting,
  createReminder,
  listReminders,
  updateReminder,
  deleteReminder
} from './db'
import { seedSampleData, clearSampleData, isSample } from './seed'

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))
const DAY = 86_400_000

beforeEach(async () => {
  await db.delete()
  await db.open()
})

describe('Meetings — Create', () => {
  it('M-C1 creates a meeting with sensible defaults and persists it', async () => {
    const m = await createMeeting()
    expect(m.title).toBe('Untitled meeting')
    expect(m.notes).toBe('')
    expect(m.transcript).toEqual([])
    expect(m.enhancedNotes).toBe('')
    expect(m.hasAudio).toBe(false)
    expect(await db.meetings.get(m.id)).toEqual(m)
  })

  it('M-C2 gives every meeting a unique id', async () => {
    const ids = await Promise.all([createMeeting(), createMeeting(), createMeeting()])
    expect(new Set(ids.map((m) => m.id)).size).toBe(3)
  })
})

describe('Meetings — Read', () => {
  it('M-R1 lists meetings newest first', async () => {
    const a = await createMeeting()
    const b = await createMeeting()
    const c = await createMeeting()
    await db.meetings.update(a.id, { createdAt: 1000 })
    await db.meetings.update(b.id, { createdAt: 3000 })
    await db.meetings.update(c.id, { createdAt: 2000 })
    const list = await listMeetings()
    expect(list.map((m) => m.id)).toEqual([b.id, c.id, a.id])
  })

  it('M-R2 returns an empty list when there are no meetings', async () => {
    expect(await listMeetings()).toEqual([])
  })
})

describe('Meetings — Update', () => {
  it('M-U1 patches only the given fields and bumps updatedAt', async () => {
    const m = await createMeeting()
    await sleep(5)
    await updateMeeting(m.id, { title: 'Renamed' })
    const after = await db.meetings.get(m.id)
    expect(after?.title).toBe('Renamed')
    expect(after?.notes).toBe(m.notes)
    expect(after!.updatedAt).toBeGreaterThan(m.updatedAt)
  })

  it('M-U2 edits user notes and the AI summary independently', async () => {
    const m = await createMeeting()
    await updateMeeting(m.id, { notes: 'my notes' })
    await updateMeeting(m.id, { enhancedNotes: '# Summary\n- fixed by hand' })
    const after = await db.meetings.get(m.id)
    expect(after?.notes).toBe('my notes')
    expect(after?.enhancedNotes).toBe('# Summary\n- fixed by hand')
  })
})

describe('Meetings — Delete', () => {
  it('M-D1 deletes the meeting AND its stored audio', async () => {
    const m = await createMeeting()
    await db.audio.put({ id: m.id, blob: new Blob(['pretend audio']) })
    expect(await db.audio.count()).toBe(1)
    await deleteMeeting(m.id)
    expect(await db.meetings.get(m.id)).toBeUndefined()
    expect(await db.audio.count()).toBe(0)
  })

  it('M-D2 deleting a missing id does not throw', async () => {
    await expect(deleteMeeting('does-not-exist')).resolves.toBeUndefined()
  })

  it('M-D3 keeps reminders that pointed at the deleted meeting', async () => {
    const m = await createMeeting()
    const r = await createReminder({ text: 'follow up', meetingId: m.id })
    await deleteMeeting(m.id)
    expect(await db.reminders.get(r.id)).toBeDefined()
  })
})

describe('Reminders — Create', () => {
  it('R-C1 creates a reminder with defaults (open, no due date, no meeting)', async () => {
    const r = await createReminder({ text: 'buy foam board' })
    expect(r.done).toBe(false)
    expect(r.dueAt).toBeNull()
    expect(r.meetingId).toBeNull()
    expect(await db.reminders.get(r.id)).toEqual(r)
  })

  it('R-C2 stores a due date and a link back to its meeting', async () => {
    const m = await createMeeting()
    const due = Date.now() + DAY
    const r = await createReminder({ text: 'revise sections', dueAt: due, meetingId: m.id })
    const stored = await db.reminders.get(r.id)
    expect(stored?.dueAt).toBe(due)
    expect(stored?.meetingId).toBe(m.id)
  })
})

describe('Reminders — Read', () => {
  it('R-R1 splits reminders into pending and done', async () => {
    const a = await createReminder({ text: 'a' })
    await createReminder({ text: 'b' })
    await updateReminder(a.id, { done: true })
    const { pending, done } = await listReminders()
    expect(pending.map((r) => r.text)).toEqual(['b'])
    expect(done.map((r) => r.text)).toEqual(['a'])
  })

  it('R-R2 sorts pending by soonest due date, with undated ones last', async () => {
    const now = Date.now()
    await createReminder({ text: 'A in 3 days', dueAt: now + 3 * DAY })
    await createReminder({ text: 'B in 1 day', dueAt: now + DAY })
    await createReminder({ text: 'C no date' })
    await createReminder({ text: 'D in 2 days', dueAt: now + 2 * DAY })
    const { pending } = await listReminders()
    expect(pending.map((r) => r.text)).toEqual([
      'B in 1 day',
      'D in 2 days',
      'A in 3 days',
      'C no date'
    ])
  })
})

describe('Reminders — Update', () => {
  it('R-U1 marking done moves it to the done list (and back)', async () => {
    const r = await createReminder({ text: 'x' })
    await updateReminder(r.id, { done: true })
    expect((await listReminders()).done).toHaveLength(1)
    await updateReminder(r.id, { done: false })
    expect((await listReminders()).pending).toHaveLength(1)
  })

  it('R-U2 edits text and due date, and can clear the due date', async () => {
    const r = await createReminder({ text: 'old', dueAt: Date.now() + DAY })
    await updateReminder(r.id, { text: 'new', dueAt: null })
    const after = await db.reminders.get(r.id)
    expect(after?.text).toBe('new')
    expect(after?.dueAt).toBeNull()
  })
})

describe('Reminders — Delete', () => {
  it('R-D1 deletes only the chosen reminder', async () => {
    const a = await createReminder({ text: 'a' })
    const b = await createReminder({ text: 'b' })
    await deleteReminder(a.id)
    expect(await db.reminders.get(a.id)).toBeUndefined()
    expect(await db.reminders.get(b.id)).toBeDefined()
  })
})

describe('Sample data', () => {
  it('S-1 seeds sample meetings and reminders, with working backlinks', async () => {
    const added = await seedSampleData()
    expect(added.meetings).toBeGreaterThan(0)
    expect(added.reminders).toBeGreaterThan(0)
    const reminders = await db.reminders.toArray()
    for (const r of reminders) {
      expect(isSample(r.id)).toBe(true)
      if (r.meetingId) expect(await db.meetings.get(r.meetingId)).toBeDefined()
    }
  })

  it('S-2 is idempotent: seeding twice does not duplicate', async () => {
    await seedSampleData()
    const before = [await db.meetings.count(), await db.reminders.count()]
    const second = await seedSampleData()
    expect(second).toEqual({ meetings: 0, reminders: 0 })
    expect([await db.meetings.count(), await db.reminders.count()]).toEqual(before)
  })

  it('S-3 never overwrites edits made to a sample meeting', async () => {
    await seedSampleData()
    await updateMeeting('sample-m1', { notes: 'MY EDIT' })
    await seedSampleData()
    expect((await db.meetings.get('sample-m1'))?.notes).toBe('MY EDIT')
  })

  it('S-4 clearing removes only sample rows and keeps the user’s own data', async () => {
    const mine = await createMeeting()
    const myReminder = await createReminder({ text: 'mine' })
    await seedSampleData()
    await clearSampleData()
    expect(await db.meetings.get(mine.id)).toBeDefined()
    expect(await db.reminders.get(myReminder.id)).toBeDefined()
    expect(await db.meetings.count()).toBe(1)
    expect(await db.reminders.count()).toBe(1)
  })
})
