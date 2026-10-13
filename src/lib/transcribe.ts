// Local Whisper. Audio never leaves the browser.
// Inference runs in a Web Worker (whisper.worker.ts) so long recordings
// don't freeze the UI; progress and partial text stream back.

export type LoadProgress = {
  status: 'downloading' | 'ready' | 'transcribing'
  file?: string
  progress?: number // downloading: 0..100, transcribing: 0..1
}

const MODEL_ID = 'Xenova/whisper-small.en'

let worker: Worker | null = null
function getWorker(): Worker {
  if (!worker) {
    worker = new Worker(new URL('./whisper.worker.ts', import.meta.url), { type: 'module' })
  }
  return worker
}

// Decode a Blob to MONO Float32 at 16 kHz (Whisper's required rate).
export async function blobToPcm16k(blob: Blob): Promise<Float32Array> {
  const AC: typeof AudioContext =
    (window as unknown as { AudioContext?: typeof AudioContext }).AudioContext ??
    (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
  const tmp = new AC()
  const buf = await blob.arrayBuffer()
  const decoded = await tmp.decodeAudioData(buf.slice(0))
  await tmp.close().catch(() => {})

  const srcLen = decoded.length
  const srcRate = decoded.sampleRate
  const mono = new Float32Array(srcLen)
  for (let c = 0; c < decoded.numberOfChannels; c++) {
    const data = decoded.getChannelData(c)
    for (let i = 0; i < srcLen; i++) mono[i] += data[i] / decoded.numberOfChannels
  }

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
  onProgress?: (p: LoadProgress) => void,
  onPartial?: (text: string) => void
): Promise<string> {
  const pcm = await blobToPcm16k(blob)
  const w = getWorker()
  return new Promise<string>((resolve, reject) => {
    w.onmessage = (e: MessageEvent) => {
      const m = e.data as
        | { type: 'model'; status: 'downloading' | 'ready'; file?: string; progress?: number }
        | { type: 'partial'; text: string; progress: number }
        | { type: 'done'; text: string }
        | { type: 'error'; message: string }
      if (m.type === 'model') onProgress?.({ status: m.status, file: m.file, progress: m.progress })
      else if (m.type === 'partial') {
        onProgress?.({ status: 'transcribing', progress: m.progress })
        onPartial?.(m.text)
      } else if (m.type === 'done') resolve(m.text)
      else if (m.type === 'error') reject(new Error(m.message))
    }
    w.onerror = (e) => reject(new Error(e.message || 'Transcription worker crashed'))
    // transfer the buffer instead of copying it (long audio = big array)
    w.postMessage({ type: 'transcribe', modelId: MODEL_ID, audio: pcm }, [pcm.buffer])
  })
}
