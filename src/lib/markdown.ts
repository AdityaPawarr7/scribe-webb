/** First `# Heading` of a markdown string, or null. Used to keep a meeting's title in sync with its summary. */
export function titleFromMarkdown(md: string): string | null {
  return md.match(/^#\s+(.+)$/m)?.[1]?.trim() || null
}
