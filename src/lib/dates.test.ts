import { describe, it, expect } from 'vitest'
import { parseDue, toDateInputValue, fromDateInputValue } from './dates'

// Tuesday 13 Oct 2026, 3 pm local.
const TUE = new Date(2026, 9, 13, 15, 0, 0).getTime()
const d = (m: number, day: number, y = 2026) => new Date(y, m - 1, day, 9, 0, 0).getTime()

describe('parseDue: relative words', () => {
  it('P-1: "by Friday" is this coming Friday', () => {
    expect(parseDue('Send screenshots by Friday', TUE).dueAt).toBe(d(10, 16))
  })
  it('P-2: today / tonight / EOD are today', () => {
    expect(parseDue('Book the room today', TUE).dueAt).toBe(d(10, 13))
    expect(parseDue('Finish it tonight', TUE).dueAt).toBe(d(10, 13))
    expect(parseDue('Reply by EOD', TUE).dueAt).toBe(d(10, 13))
  })
  it('P-3: tomorrow and day after tomorrow', () => {
    expect(parseDue('Call back tomorrow', TUE).dueAt).toBe(d(10, 14))
    expect(parseDue('Call back the day after tomorrow', TUE).dueAt).toBe(d(10, 15))
  })
  it('P-4: naming today\'s weekday means today; an earlier weekday means next week', () => {
    expect(parseDue('Do it Tuesday', TUE).dueAt).toBe(d(10, 13))
    expect(parseDue('Do it Monday', TUE).dueAt).toBe(d(10, 19))
  })
  it('P-5: "next <weekday>" means that day in next week (weeks start Monday)', () => {
    expect(parseDue('Due next Tuesday', TUE).dueAt).toBe(d(10, 20))
    expect(parseDue('Due next Friday', TUE).dueAt).toBe(d(10, 23))
  })
  it('P-6: "next week" is next Monday; "end of the week" is Friday', () => {
    expect(parseDue('Revisit next week', TUE).dueAt).toBe(d(10, 19))
    expect(parseDue('Wrap up by end of the week', TUE).dueAt).toBe(d(10, 16))
  })
  it('P-7: "in N days/weeks", including words', () => {
    expect(parseDue('in 3 days', TUE).dueAt).toBe(d(10, 16))
    expect(parseDue('in two weeks', TUE).dueAt).toBe(d(10, 27))
    expect(parseDue('in a week', TUE).dueAt).toBe(d(10, 20))
  })
})

describe('parseDue: explicit dates', () => {
  it('P-8: month-name formats', () => {
    expect(parseDue('Submit Oct 20', TUE).dueAt).toBe(d(10, 20))
    expect(parseDue('Submit October 20th', TUE).dueAt).toBe(d(10, 20))
    expect(parseDue('Submit 20 oct', TUE).dueAt).toBe(d(10, 20))
  })
  it('P-9: numeric formats', () => {
    expect(parseDue('Due 10/20', TUE).dueAt).toBe(d(10, 20))
    expect(parseDue('Due 10/20/26', TUE).dueAt).toBe(d(10, 20))
  })
  it('P-10: a recent past date stays (shows overdue); an old one rolls to next year', () => {
    expect(parseDue('Was due Oct 5', TUE).dueAt).toBe(d(10, 5))
    expect(parseDue('March 3 deadline', TUE).dueAt).toBe(d(3, 3, 2027))
  })
  it('P-11: an explicit date wins over a weekday in the same sentence', () => {
    expect(parseDue('Friday Oct 23 is the deadline', TUE).dueAt).toBe(d(10, 23))
  })
})

describe('parseDue: no date / false positives', () => {
  it('P-12: no date words gives null', () => {
    expect(parseDue('Send the slides to the team', TUE)).toEqual({ dueAt: null, phrase: null })
  })
  it('P-13: ordinary words that look like dates are ignored', () => {
    expect(parseDue('March forward with the plan', TUE).dueAt).toBeNull()
    expect(parseDue('She sat in on the call', TUE).dueAt).toBeNull()
    expect(parseDue('About 3/4 of the class agreed', TUE).dueAt).toBeNull()
  })
  it('P-14: returns the phrase it matched', () => {
    expect(parseDue('Send screenshots by Friday', TUE).phrase).toBe('friday')
  })
})

describe('parseDue: week edges', () => {
  it('P-15: on a Friday, "by Friday" is today', () => {
    const FRI = new Date(2026, 9, 16, 10, 0, 0).getTime()
    expect(parseDue('by Friday', FRI).dueAt).toBe(d(10, 16))
  })
  it('P-16: on a Sunday, "next week" is tomorrow; on a Monday it is 7 days out', () => {
    const SUN = new Date(2026, 9, 18, 10, 0, 0).getTime()
    const MON = new Date(2026, 9, 19, 10, 0, 0).getTime()
    expect(parseDue('next week', SUN).dueAt).toBe(d(10, 19))
    expect(parseDue('next week', MON).dueAt).toBe(d(10, 26))
  })
})

describe('date input helpers', () => {
  it('P-17: round-trips a local date at 09:00', () => {
    expect(toDateInputValue(d(10, 16))).toBe('2026-10-16')
    expect(fromDateInputValue('2026-10-16')).toBe(d(10, 16))
    expect(fromDateInputValue('')).toBeNull()
    expect(toDateInputValue(null)).toBe('')
  })
})
