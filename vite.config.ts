import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import { readFileSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'

// Load .env for the dev middleware without pulling in dotenv.
function loadEnv() {
  const p = resolve(process.cwd(), '.env')
  if (!existsSync(p)) return {} as Record<string, string>
  const out: Record<string, string> = {}
  for (const line of readFileSync(p, 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/i)
    if (m) out[m[1]] = m[2].replace(/^"(.*)"$/, '$1')
  }
  return out
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

// Dev-only middleware that mirrors api/summarize.ts so `npm run dev` works end-to-end.
// In production, Vercel serves api/summarize.ts directly as a serverless function.
function devApiPlugin(): Plugin {
  return {
    name: 'scribe-dev-api',
    configureServer(server) {
      const env = loadEnv()
      server.middlewares.use('/api/summarize', async (req, res) => {
        if (req.method !== 'POST') {
          res.statusCode = 405
          res.end()
          return
        }
        const chunks: Buffer[] = []
        for await (const c of req) chunks.push(c as Buffer)
        let body: { transcript?: string; notes?: string; template?: string; model?: string } = {}
        try {
          body = JSON.parse(Buffer.concat(chunks).toString('utf8'))
        } catch {
          res.statusCode = 400
          res.setHeader('content-type', 'application/json')
          res.end(JSON.stringify({ error: 'bad_json' }))
          return
        }
        const transcript = (body.transcript ?? '').slice(0, 60_000)
        const notes = (body.notes ?? '').slice(0, 10_000)
        if (!transcript && !notes) {
          res.statusCode = 400
          res.setHeader('content-type', 'application/json')
          res.end(JSON.stringify({ error: 'empty' }))
          return
        }
        const key = env.CONCENTRATE_API_KEY
        const base = env.CONCENTRATE_BASE_URL || 'https://api.concentrate.ai/v1'
        const model = body.model || env.CONCENTRATE_MODEL || 'gpt-oss-120b'
        if (!key) {
          res.statusCode = 500
          res.setHeader('content-type', 'application/json')
          res.end(JSON.stringify({ error: 'no_key', hint: 'Set CONCENTRATE_API_KEY in .env' }))
          return
        }
        const input = `TEMPLATE: ${body.template || 'generic meeting'}

MY ROUGH NOTES
${notes || '(none)'}

TRANSCRIPT
${transcript}`
        try {
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
            res.statusCode = 502
            res.setHeader('content-type', 'application/json')
            res.end(
              JSON.stringify({
                error: 'upstream',
                status: upstream.status,
                detail: text.slice(0, 500)
              })
            )
            return
          }
          const data = (await upstream.json()) as {
            output?: Array<{ content?: Array<{ type?: string; text?: string }> }>
            status?: string
          }
          let markdown = ''
          for (const msg of data.output ?? []) {
            for (const c of msg.content ?? []) {
              if (c.type === 'output_text' && c.text) {
                markdown = c.text
                break
              }
            }
            if (markdown) break
          }
          if (!markdown) {
            res.statusCode = 502
            res.setHeader('content-type', 'application/json')
            res.end(JSON.stringify({ error: 'no_text', status: data.status ?? 'unknown' }))
            return
          }
          res.statusCode = 200
          res.setHeader('content-type', 'application/json')
          res.end(JSON.stringify({ markdown }))
        } catch (err) {
          res.statusCode = 500
          res.setHeader('content-type', 'application/json')
          res.end(JSON.stringify({ error: 'exception', detail: String(err) }))
        }
      })
    }
  }
}

export default defineConfig({
  plugins: [react(), devApiPlugin()],
  optimizeDeps: { include: ['@xenova/transformers'] },
  server: { port: 5173 },
  worker: { format: 'es' }
})
