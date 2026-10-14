import { describe, it, expect } from 'vitest'
import { extractActionItems } from './actionItems'

describe('extractActionItems', () => {
  it('A-1: reads bullets from the Action items section only', () => {
    const md = `# T\n\n## Summary\n- not me\n\n## Decisions\n- dark theme\n\n## Action items\n- Send slides\n- Book room\n\n## Open questions\n- privacy note?`
    expect(extractActionItems(md).map((i) => i.text)).toEqual(['Send slides', 'Book room'])
  })
  it('A-2: "**Owner:** task" splits the owner off', () => {
    expect(extractActionItems('## Action items\n- **Maya:** send screenshots by Friday')).toEqual([
      { owner: 'Maya', text: 'send screenshots by Friday' }
    ])
  })
  it('A-3: "**Owner** to task" keeps the whole sentence', () => {
    expect(extractActionItems('## Action items\n- **Jordan** to fix the login bug')).toEqual([
      { owner: 'Jordan', text: 'Jordan to fix the login bug' }
    ])
  })
  it('A-4: ignores "None identified." and an absent section', () => {
    expect(extractActionItems('## Action items\n_None identified._')).toEqual([])
    expect(extractActionItems('## Action items\n- None identified.')).toEqual([])
    expect(extractActionItems('## Summary\ntext')).toEqual([])
  })
  it('A-5: handles numbered lists, * bullets and stray markdown', () => {
    const md = '### Action Items\n1. Email **Priya** about the [form](http://x.y)\n* `deploy` to staging'
    expect(extractActionItems(md).map((i) => i.text)).toEqual(['Email Priya about the form', 'deploy to staging'])
  })
})
