// Mic recording (always). Tab audio can be added later with getDisplayMedia.
export type Recording = { blob: Blob; durationSec: number }

export class Recorder {
  private mediaRecorder: MediaRecorder | null = null
  private chunks: Blob[] = []
  private stream: MediaStream | null = null
  private startedAt = 0

  async start() {
    this.stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    const mime = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
      ? 'audio/webm;codecs=opus'
      : 'audio/webm'
    this.mediaRecorder = new MediaRecorder(this.stream, { mimeType: mime })
    this.chunks = []
    this.mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) this.chunks.push(e.data)
    }
    this.mediaRecorder.start(1000)
    this.startedAt = Date.now()
  }

  async stop(): Promise<Recording> {
    const mr = this.mediaRecorder
    if (!mr) throw new Error('not recording')
    return await new Promise((resolve) => {
      mr.onstop = () => {
        const blob = new Blob(this.chunks, { type: mr.mimeType })
        const durationSec = (Date.now() - this.startedAt) / 1000
        this.stream?.getTracks().forEach((t) => t.stop())
        this.stream = null
        this.mediaRecorder = null
        resolve({ blob, durationSec })
      }
      mr.stop()
    })
  }

  isRecording() {
    return this.mediaRecorder?.state === 'recording'
  }
}
