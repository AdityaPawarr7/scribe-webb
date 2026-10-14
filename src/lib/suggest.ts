import { extractActionItems } from './actionItems'
import { parseDue } from './dates'

export interface Suggestion {
  /** Stable key for the list in the UI. */
  key: string
  text: string
  owner: string | null
  dueAt: number | null
  /** The words the date came from, e.g. "by Friday". */
  phrase: string | null
}

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()

/**
 * Suggested reminders for one meeting: its action items, each with a due date if the wording gave one.
 * Items already saved as a reminder for the same meeting are left out so re-running never duplicates.
 * Nothing is saved here; the user confirms in the UI.
 */
export function suggestReminders(
  markdown: string,
  meetingId: string,
  existing: Array<{ text: string; meetingId: string | null }>,
  now: number = Date.now()
): Suggestion[] {
  const have = new Set(existing.filter((r) => r.meetingId === meetingId).map((r) => norm(r.text)))
  const seen = new Set<string>()
  const out: Suggestion[] = []
  extractActionItems(markdown).forEach((item, i) => {
    const key = norm(item.text)
    if (!key || have.has(key) || seen.has(key)) return
    seen.add(key)
    const due = parseDue(item.text, now)
    out.push({ key: `${i}-${key}`, text: item.text, owner: item.owner, dueAt: due.dueAt, phrase: due.phrase })
  })
  return out
}
