// Local Whisper via transformers.js. Audio never leaves the browser.
// transformers.js is DYNAMICALLY imported (eager import crashes under Vite dev).

type Transcriber = (
  audio: Float32Array,
  opts?: Record<string, unknown>
) => Promise<{ text: string } | { text: string }[]>

export type LoadProgress = {
  status: 'downloading' | 'loading' | 'ready'
  file?: string
  progress?: number
}

let transcriberP: Promise<Transcriber> | null = null

export async function getTranscriber(
  modelId: string = 'Xenova/whisper-small.en',
  onProgress?: (p: LoadProgress) => void
): Promise<Transcriber> {
  if (!transcriberP) {
    transcriberP = (async () => {
      const { pipeline, env } = await import('@xenova/transformers')
      env.allowLocalModels = false
      env.useBrowserCache = true
      const pipe = await pipeline('automatic-speech-recognition', modelId, {
        progress_callback: (p: {
          status: string
          file?: string
          progress?: number
        }) => {
          if (p.status === 'progress' && onProgress) {
            onProgress({ status: 'downloading', file: p.file, progress: p.progress })
          } else if (p.status === 'ready' && onProgress) {
            onProgress({ status: 'ready' })
          }
        }
      })
      return pipe as unknown as Transcriber
    })()
  }
  return transcriberP
}

// Decode a Blob to a MONO Float32Array AT 16 kHz. Whisper requires 16 kHz;
// giving it 48 kHz audio makes it emit [S] silence tokens because what it hears
// is high-pitched garbage.
export async function blobToPcm16k(blob: Blob): Promise<Float32Array> {
  // Step 1: decode at the file's native rate using a regular AudioContext.
  const AC: typeof AudioContext =
    (window as unknown as { AudioContext?: typeof AudioContext }).AudioContext ??
    (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
  const tmp = new AC()
  const buf = await blob.arrayBuffer()
  const decoded = await tmp.decodeAudioData(buf.slice(0))
  await tmp.close().catch(() => {})

  // Step 2: downmix to mono at the original rate.
  const srcLen = decoded.length
  const srcRate = decoded.sampleRate
  const mono = new Float32Array(srcLen)
  for (let c = 0; c < decoded.numberOfChannels; c++) {
    const data = decoded.getChannelData(c)
    for (let i = 0; i < srcLen; i++) mono[i] += data[i] / decoded.numberOfChannels
  }

  // Step 3: resample mono to 16 kHz via OfflineAudioContext.
  const dstRate = 16000
  if (srcRate === dstRate) return mono
  const dstLen = Math.ceil((srcLen * dstRate) / srcRate)
  const offline = new OfflineAudioContext(1, dstLen, dstRate)
  const srcBuf = offline.createBuffer(1, srcLen, srcRate)
  srcBuf.copyToChannel(mono, 0)
  const node = offline.createBufferSource()
  node.buffer = srcBuf
  node.connect(offline.destination)
  node.start()
  const rendered = await offline.startRendering()
  return rendered.getChannelData(0)
}

export async function transcribe(
  blob: Blob,
  onProgress?: (p: LoadProgress) => void
): Promise<string> {
  const pcm = await blobToPcm16k(blob)
  const t = await getTranscriber('Xenova/whisper-small.en', onProgress)
  const out = await t(pcm, {
    chunk_length_s: 30,
    stride_length_s: 5,
    language: 'english',
    task: 'transcribe',
    return_timestamps: false
  })
  const text = Array.isArray(out) ? out.map((o) => o.text).join(' ') : out.text
  return text.trim()
}
