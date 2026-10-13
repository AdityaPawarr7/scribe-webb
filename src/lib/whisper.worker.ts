// Runs Whisper OFF the main thread so the UI never freezes on long audio.
// Audio is processed in 30 s chunks; progress + partial text stream back.

type InMsg = { type: 'transcribe'; modelId: string; audio: Float32Array }
type OutMsg =
  | { type: 'model'; status: 'downloading' | 'ready'; file?: string; progress?: number }
  | { type: 'partial'; text: string; progress: number }
  | { type: 'done'; text: string }
  | { type: 'error'; message: string }

const ctx = self as unknown as {
  postMessage: (m: OutMsg) => void
  onmessage: ((e: MessageEvent<InMsg>) => void) | null
}

type Transcriber = (
  audio: Float32Array,
  opts?: Record<string, unknown>
) => Promise<{ text: string } | { text: string }[]>

let transcriberP: Promise<Transcriber> | null = null
let loadedModel = ''

async function getTranscriber(modelId: string): Promise<Transcriber> {
  if (!transcriberP || loadedModel !== modelId) {
    loadedModel = modelId
    transcriberP = (async () => {
      const { pipeline, env } = await import('@xenova/transformers')
      env.allowLocalModels = false
      env.useBrowserCache = true
      const pipe = await pipeline('automatic-speech-recognition', modelId, {
        progress_callback: (p: { status: string; file?: string; progress?: number }) => {
          if (p.status === 'progress') {
            ctx.postMessage({ type: 'model', status: 'downloading', file: p.file, progress: p.progress })
          } else if (p.status === 'ready') {
            ctx.postMessage({ type: 'model', status: 'ready' })
          }
        }
      })
      return pipe as unknown as Transcriber
    })()
  }
  return transcriberP
}

const SAMPLE_RATE = 16000
const CHUNK = 30 * SAMPLE_RATE

ctx.onmessage = async (e) => {
  if (e.data.type !== 'transcribe') return
  try {
    const { modelId, audio } = e.data
    const t = await getTranscriber(modelId)
    const parts: string[] = []
    const total = Math.max(1, Math.ceil(audio.length / CHUNK))
    for (let i = 0; i < total; i++) {
      const slice = audio.subarray(i * CHUNK, (i + 1) * CHUNK)
      const out = await t(slice, { language: 'english', task: 'transcribe', return_timestamps: false })
      const text = (Array.isArray(out) ? out.map((o) => o.text).join(' ') : out.text).trim()
      if (text) parts.push(text)
      ctx.postMessage({ type: 'partial', text: parts.join(' '), progress: (i + 1) / total })
    }
    ctx.postMessage({ type: 'done', text: parts.join(' ') })
  } catch (err) {
    ctx.postMessage({ type: 'error', message: err instanceof Error ? err.message : String(err) })
  }
}
