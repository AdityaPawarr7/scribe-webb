import { describe, it, expect } from 'vitest'
import { titleFromMarkdown } from './markdown'

describe('titleFromMarkdown', () => {
  it('E-1: returns the first top-level heading', () => {
    expect(titleFromMarkdown('# Pumping Lemma\n\n## Summary\ntext')).toBe('Pumping Lemma')
  })
  it('E-2: returns null when there is no heading (so an edit that removes it does not blank the title)', () => {
    expect(titleFromMarkdown('just text\n## Summary')).toBeNull()
  })
  it('E-3: ignores second-level headings and trims whitespace', () => {
    expect(titleFromMarkdown('## Not it\n#   Real title  \n')).toBe('Real title')
  })
})
