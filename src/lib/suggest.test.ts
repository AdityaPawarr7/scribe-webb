import { describe, it, expect } from 'vitest'
import { suggestReminders } from './suggest'

const TUE = new Date(2026, 9, 13, 15, 0, 0).getTime()
const d = (m: number, day: number) => new Date(2026, m - 1, day, 9, 0, 0).getTime()
const MD = `# Demo Sync

## Action items
- **Maya:** send the final screenshots to Priya by Friday
- **Jordan:** fix the login bug and deploy to staging by Wednesday
- Book the room today
- Ask about the privacy note`

describe('suggestReminders', () => {
  it('S-1: one suggestion per action item, with due dates where the wording gives one', () => {
    const s = suggestReminders(MD, 'm1', [], TUE)
    expect(s.map((x) => x.text)).toEqual([
      'send the final screenshots to Priya by Friday',
      'fix the login bug and deploy to staging by Wednesday',
      'Book the room today',
      'Ask about the privacy note'
    ])
    expect(s.map((x) => x.dueAt)).toEqual([d(10, 16), d(10, 14), d(10, 13), null])
    expect(s[0].owner).toBe('Maya')
  })
  it('S-2: skips items already saved as a reminder for the same meeting', () => {
    const s = suggestReminders(MD, 'm1', [{ text: 'Book the room today.', meetingId: 'm1' }], TUE)
    expect(s.map((x) => x.text)).not.toContain('Book the room today')
    expect(s).toHaveLength(3)
  })
  it('S-3: a same-text reminder on a different meeting does not hide the suggestion', () => {
    const s = suggestReminders(MD, 'm1', [{ text: 'Book the room today', meetingId: 'other' }], TUE)
    expect(s).toHaveLength(4)
  })
  it('S-4: duplicates within one summary are collapsed; empty input gives nothing', () => {
    expect(suggestReminders('## Action items\n- Call Sam\n- call sam!', 'm', [], TUE)).toHaveLength(1)
    expect(suggestReminders('', 'm', [], TUE)).toEqual([])
  })
})
