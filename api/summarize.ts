// Vercel serverless function. Concentrate key lives ONLY here.
export const config = { runtime: 'edge' }

interface Body {
  transcript: string
  notes?: string
  template?: string
  model?: string
}

const WINDOW_MS = 60 * 60 * 1000
const MAX_PER_WINDOW = 20
const ipHits = new Map<string, { count: number; resetAt: number }>()

function rateLimit(ip: string): { ok: boolean; retryAfter?: number } {
  const now = Date.now()
  const cur = ipHits.get(ip)
  if (!cur || cur.resetAt < now) {
    ipHits.set(ip, { count: 1, resetAt: now + WINDOW_MS })
    return { ok: true }
  }
  if (cur.count >= MAX_PER_WINDOW) {
    return { ok: false, retryAfter: Math.ceil((cur.resetAt - now) / 1000) }
  }
  cur.count += 1
  return { ok: true }
}

const SYSTEM_PROMPT = `You are Scribe, an assistant that turns raw meeting transcripts and rough notes into clean, structured meeting notes.
Return markdown with:
# Title
A one-line title in Title Case.

## Summary
2-5 sentences capturing the point of the conversation.

## Decisions
- bullet list; omit section if none

## Action items
- bullet list; owner in **bold** when identifiable; omit section if none

## Open questions
- bullet list; omit section if none

Keep the user's own notes verbatim where they clearly state facts; prefer the transcript as the source of truth for who said what. Never invent facts.`

interface ResponsesPayload {
  status?: string
  output?: Array<{ content?: Array<{ type?: string; text?: string }> }>
}
function extractText(data: ResponsesPayload): string {
  for (const msg of data.output ?? []) {
    for (const c of msg.content ?? []) {
      if (c.type === 'output_text' && c.text) return c.text
    }
  }
  return ''
}

export default async function handler(req: Request): Promise<Response> {
  try {
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 })
  const ip =
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    req.headers.get('x-real-ip') ??
    'unknown'
  const rl = rateLimit(ip)
  if (!rl.ok) {
    return new Response(
      JSON.stringify({ error: 'rate_limited', retryAfter: rl.retryAfter }),
      { status: 429, headers: { 'content-type': 'application/json' } }
    )
  }

  let body: Body
  try {
    body = (await req.json()) as Body
  } catch {
    return new Response(JSON.stringify({ error: 'bad_json' }), { status: 400 })
  }
  const transcript = (body.transcript ?? '').slice(0, 60_000)
  const notes = (body.notes ?? '').slice(0, 10_000)
  if (!transcript && !notes) {
    return new Response(JSON.stringify({ error: 'empty' }), { status: 400 })
  }

  const key = process.env.CONCENTRATE_API_KEY
  const base = process.env.CONCENTRATE_BASE_URL ?? 'https://api.concentrate.ai/v1'
  const model = body.model || process.env.CONCENTRATE_MODEL || 'gpt-oss-120b'
  if (!key) return new Response(JSON.stringify({ error: 'no_key' }), { status: 500 })

  const input = `TEMPLATE: ${body.template || 'generic meeting'}

MY ROUGH NOTES
${notes || '(none)'}

TRANSCRIPT
${transcript}`

  const upstream = await fetch(`${base}/responses`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${key}`
    },
    body: JSON.stringify({
      model,
      instructions: SYSTEM_PROMPT,
      input,
      max_output_tokens: 4000
    })
  })

  if (!upstream.ok) {
    const text = await upstream.text()
    return new Response(
      JSON.stringify({
        error: 'upstream',
        status: upstream.status,
        detail: text.slice(0, 500)
      }),
      { status: 502, headers: { 'content-type': 'application/json' } }
    )
  }
  const data = (await upstream.json()) as ResponsesPayload
  const markdown = extractText(data)
  if (!markdown) {
    return new Response(
      JSON.stringify({ error: 'no_text', status: data.status ?? 'unknown' }),
      { status: 502, headers: { 'content-type': 'application/json' } }
    )
  }
  return new Response(JSON.stringify({ markdown }), {
    status: 200,
    headers: { 'content-type': 'application/json' }
  })
  } catch (err) {
    return new Response(
      JSON.stringify({ error: 'exception', detail: String(err).slice(0, 500) }),
      { status: 500, headers: { 'content-type': 'application/json' } }
    )
  }
}
