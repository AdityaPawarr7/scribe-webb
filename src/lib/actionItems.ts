export interface ActionItem {
  /** What the reminder should say (markdown stripped, "**Me:**" style owner prefix removed). */
  text: string
  /** Who it is for if the summary named someone, else null. */
  owner: string | null
}

const stripMarkdown = (s: string) =>
  s.replace(/\[([^\]]+)\]\([^)]*\)/g, '$1').replace(/[*_`~]/g, '').replace(/\s+/g, ' ').trim()

/**
 * Pull the bullet points out of the "Action items" section of a Scribe summary.
 * Ignores "None identified." placeholders, other sections, and anything outside a list.
 */
export function extractActionItems(markdown: string): ActionItem[] {
  const items: ActionItem[] = []
  let inSection = false
  for (const line of markdown.split('\n')) {
    const heading = /^#{1,6}\s+(.*)$/.exec(line)
    if (heading) {
      inSection = /^action items?\b/i.test(stripMarkdown(heading[1]))
      continue
    }
    if (!inSection) continue
    const bullet = /^\s*(?:[-*+]|\d+[.)])\s+(.*\S)\s*$/.exec(line)
    if (!bullet) continue
    let raw = bullet[1]
    const plain = stripMarkdown(raw)
    if (!plain || /^(none|n\/a|no action items?|nothing)\b/i.test(plain)) continue

    // "**Maya:** send the slides"  -> owner Maya, text "send the slides"
    // "**Maya** to send the slides" -> owner Maya, text "Maya to send the slides"
    let owner: string | null = null
    const bold = /^\*\*(.+?)\*\*(.*)$/.exec(raw)
    if (bold) {
      const label = stripMarkdown(bold[1])
      const rest = bold[2]
      if (/:\s*$/.test(label) || /^\s*[:\-–—]/.test(rest)) {
        owner = label.replace(/[:\s]+$/, '')
        raw = rest.replace(/^\s*[:\-–—]\s*/, '').trim() || raw
      } else {
        owner = label
      }
    }
    const text = stripMarkdown(raw)
    if (text) items.push({ text, owner })
  }
  return items
}
