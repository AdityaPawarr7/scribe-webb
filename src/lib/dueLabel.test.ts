import { describe, it, expect } from 'vitest'
import { dueLabel } from './dueLabel'

// Fixed clock: 3 pm local on 15 Oct 2026 (so "due this morning" is already in the past).
const NOW = new Date(2026, 9, 15, 15, 0, 0).getTime()

describe('dueLabel', () => {
  it('D-1: due earlier today is "due today", NOT overdue (regression: showed overdue after 9 am)', () => {
    const r = dueLabel(new Date(2026, 9, 15, 9, 0, 0).getTime(), false, NOW)
    expect(r.label).toBe('due today')
    expect(r.label).not.toContain('overdue')
    expect(r.tone).toContain('amber')
  })

  it('D-2: due yesterday is overdue', () => {
    const r = dueLabel(new Date(2026, 9, 14, 12, 0, 0).getTime(), false, NOW)
    expect(r.label).toContain('overdue')
    expect(r.tone).toContain('red')
  })

  it('D-3: due in a few days is a plain date with no warning tone', () => {
    const r = dueLabel(new Date(2026, 9, 20, 12, 0, 0).getTime(), false, NOW)
    expect(r.label).toMatch(/^due /)
    expect(r.label).not.toContain('overdue')
    expect(r.tone).toBe('')
  })

  it('D-4: a completed reminder is never flagged overdue', () => {
    const r = dueLabel(new Date(2026, 9, 1, 12, 0, 0).getTime(), true, NOW)
    expect(r.label).not.toContain('overdue')
    expect(r.tone).toBe('')
  })
})
