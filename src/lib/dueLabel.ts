export type DueMeta = { label: string; tone: string }

/**
 * Label and colour for a reminder's due date.
 * Overdue means the due DATE is before today, so a reminder due later today is never overdue.
 * `now` is injectable so tests can pin the clock.
 */
export function dueLabel(ts: number, done: boolean, now: number = Date.now()): DueMeta {
  const d = new Date(ts)
  const sameDay = d.toDateString() === new Date(now).toDateString()
  const label = sameDay
    ? 'due today'
    : `due ${d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`
  if (done) return { label, tone: '' }
  const startOfToday = new Date(now)
  startOfToday.setHours(0, 0, 0, 0)
  if (ts < startOfToday.getTime()) return { label: label + ' \u00b7 overdue', tone: 'text-red-600 dark:text-red-400' }
  if (sameDay || ts - now < 24 * 60 * 60 * 1000) return { label, tone: 'text-amber-600 dark:text-amber-400' }
  return { label, tone: '' }
}
