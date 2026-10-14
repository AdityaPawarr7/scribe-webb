/**
 * Turns phrases like "by Friday", "tomorrow", "next Tuesday", "in 3 days" or "Oct 20" into a due date.
 * Pure and clock-injectable so it can be tested. Dates are stored at 09:00 local time, matching the
 * Reminders form, so "due today" and "overdue" behave the same for suggested and hand-made reminders.
 */

export interface ParsedDue {
  dueAt: number | null
  /** The part of the text that produced the date, for showing "from 'by Friday'". */
  phrase: string | null
}

const NONE: ParsedDue = { dueAt: null, phrase: null }

const WEEKDAYS: Record<string, number> = {
  sunday: 0, monday: 1, tuesday: 2, tues: 2, wednesday: 3, thursday: 4, thurs: 4, thur: 4,
  friday: 5, fri: 5, saturday: 6
}
const MONTHS: Record<string, number> = {
  january: 0, jan: 0, february: 1, feb: 1, march: 2, mar: 2, april: 3, apr: 3, may: 4,
  june: 5, jun: 5, july: 6, jul: 6, august: 7, aug: 7, september: 8, sept: 8, sep: 8,
  october: 9, oct: 9, november: 10, nov: 10, december: 11, dec: 11
}
const NUMBER_WORDS: Record<string, number> = {
  a: 1, an: 1, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10
}

const at9 = (y: number, m: number, d: number) => new Date(y, m, d, 9, 0, 0, 0).getTime()
const day = (base: Date, plusDays: number) =>
  at9(base.getFullYear(), base.getMonth(), base.getDate() + plusDays)

const weekdayNames = Object.keys(WEEKDAYS).sort((a, b) => b.length - a.length).join('|')
const monthNames = Object.keys(MONTHS).sort((a, b) => b.length - a.length).join('|')

export function parseDue(text: string, now: number = Date.now()): ParsedDue {
  const t = text.toLowerCase()
  const today = new Date(now)
  const y = today.getFullYear()
  const todayStart = new Date(y, today.getMonth(), today.getDate()).getTime()

  const pickExplicit = (month: number, dom: number, phrase: string): ParsedDue => {
    if (dom < 1 || dom > 31) return NONE
    let dueAt = at9(y, month, dom)
    // A date that already passed long ago most likely means next year; a recent one stays (shows overdue).
    if (dueAt < todayStart - 30 * 86_400_000) dueAt = at9(y + 1, month, dom)
    return { dueAt, phrase }
  }

  // 1. "october 20", "oct 20th", "oct. 20"
  let m = new RegExp(`\\b(${monthNames})\\.?\\s+(\\d{1,2})(?:st|nd|rd|th)?\\b`).exec(t)
  if (m) {
    const r = pickExplicit(MONTHS[m[1]], Number(m[2]), m[0])
    if (r.dueAt !== null) return r
  }
  // 2. "20 october", "20th of oct"
  m = new RegExp(`\\b(\\d{1,2})(?:st|nd|rd|th)?\\s+(?:of\\s+)?(${monthNames})\\b`).exec(t)
  if (m) {
    const r = pickExplicit(MONTHS[m[2]], Number(m[1]), m[0])
    if (r.dueAt !== null) return r
  }
  // 3. numeric "10/20" or "10/20/26"
  m = /\b(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?\b/.exec(t)
  // "3/4 of the class" or "about 1/2" are fractions, not dates
  if (m) {
    const before = t.slice(0, m.index)
    const after = t.slice(m.index + m[0].length)
    if (/^\s*(of|ths?|rds?)\b/.test(after) || /\b(about|around|roughly|nearly|almost|over|under|approximately)\s+$/.test(before)) m = null
  }
  if (m && Number(m[1]) >= 1 && Number(m[1]) <= 12) {
    const month = Number(m[1]) - 1
    const dom = Number(m[2])
    if (m[3]) {
      const yr = m[3].length === 2 ? 2000 + Number(m[3]) : Number(m[3])
      if (dom >= 1 && dom <= 31) return { dueAt: at9(yr, month, dom), phrase: m[0] }
    } else {
      const r = pickExplicit(month, dom, m[0])
      if (r.dueAt !== null) return r
    }
  }

  // 4. "in 3 days", "in two weeks", "in a week"
  m = new RegExp(`\\bin\\s+(\\d+|${Object.keys(NUMBER_WORDS).join('|')})\\s+(day|week)s?\\b`).exec(t)
  if (m) {
    const n = /^\d+$/.test(m[1]) ? Number(m[1]) : NUMBER_WORDS[m[1]]
    return { dueAt: day(today, n * (m[2] === 'week' ? 7 : 1)), phrase: m[0] }
  }

  // 5. simple relative words
  m = /\b(day after tomorrow)\b/.exec(t)
  if (m) return { dueAt: day(today, 2), phrase: m[0] }
  m = /\b(tomorrow)\b/.exec(t)
  if (m) return { dueAt: day(today, 1), phrase: m[0] }
  m = /\b(today|tonight|this (?:morning|afternoon|evening)|end of (?:the )?day|eod)\b/.exec(t)
  if (m) return { dueAt: day(today, 0), phrase: m[0] }
  m = /\b(end of (?:the )?week|eow)\b/.exec(t)
  if (m) return { dueAt: day(today, (5 - today.getDay() + 7) % 7), phrase: m[0] }
  m = /\b(next week)\b/.exec(t)
  if (m) return { dueAt: day(today, daysUntilNextWeekStart(today)), phrase: m[0] }

  // 6. weekdays: "friday", "by friday", "this friday", "next tuesday"
  m = new RegExp(`\\b(?:(next|this)\\s+)?(${weekdayNames})\\b`).exec(t)
  if (m) {
    const target = WEEKDAYS[m[2]]
    if (m[1] === 'next') {
      // "next friday" = that weekday in next week (weeks start Monday)
      const offsetFromMonday = (target + 6) % 7
      return { dueAt: day(today, daysUntilNextWeekStart(today) + offsetFromMonday), phrase: m[0] }
    }
    // plain/"this": the nearest one on or after today (today counts)
    return { dueAt: day(today, (target - today.getDay() + 7) % 7), phrase: m[0] }
  }

  return NONE
}

/** Days from `d` to the Monday that starts next week (always 1 to 7). */
function daysUntilNextWeekStart(d: Date): number {
  return ((8 - d.getDay()) % 7) || 7
}

/** `yyyy-mm-dd` in LOCAL time, for <input type="date">. */
export function toDateInputValue(ts: number | null): string {
  if (ts === null) return ''
  const d = new Date(ts)
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${mm}-${dd}`
}

/** Inverse of toDateInputValue: 09:00 local on that date, or null for empty input. */
export function fromDateInputValue(v: string): number | null {
  return v ? new Date(v + 'T09:00').getTime() : null
}
