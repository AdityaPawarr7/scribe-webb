# Step 2c — Technical Research

> Scope: pick a stack for Scribe (web app, Concentrate API for LLM, limited public demo). Decisions below favor **cheap, boring, and secure** over clever. Final choices are at the bottom.

> **Update after building (Step 3):** the research below is the plan I made *before* writing code. Section 7b records where reality differed. See [03-prototype.md](03-prototype.md) for what shipped.

## Questions to answer
1. How do you capture audio in a browser? What actually works across machines?
2. Which transcription service — cost, latency, quality, limits?
3. Where does the Concentrate API key live, and how do we stop one abuser from draining the demo?
4. Where do meetings and transcripts get stored? (Local-first or hosted?)
5. Where do we host, and what's it cost at zero traffic?

---

## 1. Audio capture in the browser

Three paths exist. None is as clean as what a native app like Granola does.

| Path | API | What you get | Where it breaks |
|---|---|---|---|
| **Microphone** | `navigator.mediaDevices.getUserMedia({audio: true})` | Clean mic input from the laptop/headset mic | Only captures what the mic hears — the person at the other end of a Zoom call is quiet or missing unless you un-mute speakers and let the mic re-capture them (bad quality) |
| **Tab audio** | `navigator.mediaDevices.getDisplayMedia({audio: true, video: true})` | Audio of a specific browser tab (plus a required video stream) | **Chrome/Edge only.** Firefox and Safari don't return tab audio from this call. Also requires the user to pick the specific tab in the system picker each time, which is friction. Works great for Google Meet / Zoom-in-browser; useless for the Zoom desktop app. |
| **System audio** | `getDisplayMedia` with "Entire screen" + audio | Everything the OS plays | Chrome only, Windows only (macOS blocks system audio capture through the browser). Not usable as a baseline. |

### What this means for Scribe
- **MVP = mic + optional tab audio.** Mic always, tab audio as an "advanced" toggle for Chrome users on web calls.
- **Mix the two streams** before sending to transcription if both are on: a `MediaStreamAudioDestinationNode` in the Web Audio API lets us merge them into one track. Otherwise you pay for transcription twice.
- Record to `MediaRecorder` → Opus in a WebM container. Chrome, Firefox, and Safari 14.1+ all record this.
- **Honesty line for the UI:** "Scribe captures what your microphone hears, plus the audio of the browser tab you pick. Zoom's desktop app and most video calls outside the browser can't be captured — put your mic near the speakers if you need to."

### Risks
- Users think it's recording a Zoom desktop call when it isn't. **Mitigation:** before recording starts, show a one-sentence check: "You're recording *mic + your Chrome tab 'Google Meet'*. Anything playing in another app won't be captured."
- Permission UI differs per browser; the tab picker is slow. **Mitigation:** remember the last choice and let the user press "Record" with one click after the first setup.

---

## 2. Transcription

Five options, grouped by cost. The **free** options are the ones that make this project not depend on a budget line.

### Free options

| Option | How it works | Pros | Cons |
|---|---|---|---|
| **Whisper in the browser via transformers.js** (Xenova/Hugging Face) | Loads an ONNX-converted Whisper model into the browser and runs it on **WebGPU** (fallback: WASM). Audio never leaves the user's machine. | 🆓 **Truly free, truly local.** Zero API cost. Best possible privacy story — audio and transcript stay on the device. Quality on `whisper-base` is strong for English lectures. Works offline after model download. | ~40 MB (tiny) to ~75 MB (base) model download on first use — one-time, cached in browser. CPU-only machines are slow (roughly real-time or worse on `base`); WebGPU-capable machines (most modern Chrome/Edge) are 3–5× faster than real time. |
| **Web Speech API** (`webkitSpeechRecognition`) | Chrome's built-in `SpeechRecognition` streams audio to Google in the background and returns live text. | 🆓 Free, built-in, truly streaming (words appear live), no model download. | Chrome/Edge only (Firefox doesn't ship it, Safari partial). Audio actually goes to Google under the hood — not local, worse privacy story than Whisper-in-browser. Sessions time out around 60 s and have to be restarted. Quality is noticeably worse than Whisper on technical vocabulary. |
| **whisper.cpp WASM** | Lower-level: whisper.cpp compiled to WebAssembly, no transformers.js layer. | Same free + local story as transformers.js. | More plumbing to wire up; worse DX than transformers.js. No upside over it for a prototype. |

### Paid options (for reference)

| Option | Approx price | Pros | Cons |
|---|---|---|---|
| OpenAI Whisper API (`whisper-1` / `gpt-4o-mini-transcribe`) | ~$0.006/min | Easy REST, best English accuracy | Batch only, needs a key, costs money |
| Deepgram Nova-2 | ~$0.0043/min | True streaming, speaker labels | More to learn, costs money |
| AssemblyAI | ~$0.025/min streaming | Best diarization + built-in summaries | Priciest |

### Decision for Scribe
- **MVP = Whisper in the browser via `@xenova/transformers`** with the `Xenova/whisper-base` model (~75 MB).
  - 🆓 Zero transcription cost means the only money that flows is to the Concentrate API for the summary, which is already small (~a few cents per meeting).
  - The privacy story becomes very clean: **audio never leaves the user's device**, and only the transcript text goes to the server function to be summarized. For sensitive meetings, the user can even disable the summary call and keep the whole flow local.
  - WebGPU is the fast path (Chrome, Edge, latest Safari); WASM fallback keeps it working everywhere, just slower. For a 10–20 minute lecture clip in demo, this is fine.
- **First-run UX:** show a one-time progress bar while the model downloads (~75 MB over fast wifi takes ~5 s). Cache it with `caches.open()` or let transformers.js cache it in IndexedDB (its default). Second run: instant.
- **Fallback option in UI:** a "use faster cloud transcription" toggle that routes through the server to OpenAI Whisper — only enabled if the user has a key or if we leave a small server budget for it. Not needed for MVP.

### Risks
- **CPU-only laptop + long recording = painful wait.** A 30-min recording on a CPU-only machine with `whisper-base` could take 20+ minutes to transcribe. **Mitigation:** detect WebGPU on page load; if absent, warn the user and offer `whisper-tiny` (~40 MB, 2–3× faster but less accurate) or cap the recording length lower.
- **Hallucination on silence/music.** Whisper invents phrases on empty audio regardless of where it runs. **Mitigation:** voice-activity detection (VAD) via a small library like `@ricky0123/vad-web` to drop silent segments before feeding Whisper.
- **Model download looks like a bug.** 75 MB on first visit without warning feels broken. **Mitigation:** explicit "Downloading transcription model (one time)…" with a progress bar; cached after that.
- **Mobile browsers / Safari older than 17:** no WebGPU, limited WASM memory. **Mitigation:** detect and fall back to the Web Speech API on mobile Safari with a visible note about reduced quality.

---

## 3. The Concentrate API key — how it stays safe

**Non-negotiable:** the key never ships to the browser. Any `fetch("https://api.concentrate.ai/...", { headers: { Authorization: KEY }})` in client code = key stolen on first `view-source`.

### The pattern
```
Browser  →  POST /api/summarize { audioRef, prompt }
                     ↓
          Vercel/Cloudflare function
                     ↓  Authorization: Bearer $CONCENTRATE_KEY (from env)
                Concentrate API
                     ↓
          summary text  →  browser
```

The function is a thin passthrough that:
1. Checks a short-lived session cookie or anonymous ID exists
2. Rate-limits per IP + per anonymous ID
3. Checks the global spend counter
4. Forwards the request with the server-side key
5. Logs usage so the counter can increment

### Rate limiting — 3 layers, cheapest first
| Layer | Where | What it stops |
|---|---|---|
| **Per IP** (e.g. 10 requests/min, 50/day) | Vercel KV + `@upstash/ratelimit`, or Cloudflare's bundled rate-limiter | One tab hammering the endpoint |
| **Per anonymous session** (e.g. 5 summaries/day, 60 min audio/day) | Signed cookie set on first visit; counter in KV | One person switching tabs/VPNs |
| **Global spend cap** (e.g. $20/mo for this demo) | A single KV counter the function reads before every call; function returns 429 when hit | The project itself going viral and bankrupting me |

Audio length limits: reject recordings over N minutes (e.g. 45) client-side **and** server-side. Client-side so the user sees the error immediately; server-side because the client is untrusted.

### Risks
- Someone finds the endpoint and scripts around the rate limit by rotating IPs. **Mitigation:** the global cap is the real backstop; the per-IP limit is just friction.
- "Bring your own key" option — a toggle that lets the user paste their own Concentrate (or OpenAI) key, which bypasses our server entirely. Call it out in the UI as the way to lift the demo limits. (Noted as a v2.)

---

## 4. Storage

Two axes: where meetings live (local vs hosted), and where audio blobs live (local vs vendor).

### Meetings and transcripts
- **IndexedDB (local-first)** is the clear MVP choice:
  - No account system to build.
  - Nothing of the user's text ever hits our server beyond the transcription/summary round-trip (and the server function can be stateless — doesn't persist the audio).
  - Great story for the privacy section of the write-up.
  - Browser quotas are generous: Chrome gives up to ~60% of free disk by default (gigabytes), Firefox similar, Safari ~1GB without a prompt. Plenty for notes.
  - Trade-off: nothing syncs across devices. Fine for a prototype; call it out.
- **localStorage** is wrong here — 5MB cap, synchronous API, string-only. A single transcript blows past the quota.

### Audio blobs
- Keep audio blobs **in IndexedDB** too (as `Blob`s), not on a server. We transcribe them once and can delete them right after if the user wants.
- Default to **delete audio after transcription** with a per-meeting override. This is a one-switch improvement to the trust story.

### Risks
- IndexedDB can be cleared by the browser (private windows, "clear site data", quota pressure). **Mitigation:** add an **Export JSON** button so users can back up their meetings.
- `navigator.storage.persist()` can request the browser not to evict our data; call it on first use.

---

## 5. Hosting

| Host | Free tier (as of 2026) | Fit |
|---|---|---|
| **Vercel** | Hobby plan: 100 GB bandwidth/mo, serverless functions with sensible limits, KV (via Upstash) for rate-limit counters, env vars for secrets | ✅ Default pick. Everything in one place, deploy is a `git push`. |
| **Cloudflare Workers / Pages** | 100k requests/day free, Workers KV for counters, Durable Objects for atomic increments | Also excellent; a bit more plumbing. Choose if we outgrow Vercel's function limits. |
| **Netlify** | Comparable to Vercel | Fine but no advantage. |
| **Fly.io / Render** | Needs a long-running server for what could be a stateless function | Overkill. |

**Decision: Vercel.** Hobby plan handles a class demo trivially. Store the Concentrate key in Vercel's env vars. Store rate-limit counters in Vercel KV.

---

## 6. Front-end stack

Deliberately boring:
- **Vite + React + TypeScript** — fast dev loop, universally supported by AI assistants, trivial to deploy on Vercel.
- **Tailwind** for styling. No design system to learn.
- **Dexie.js** as the IndexedDB wrapper (readable API vs raw IndexedDB).
- **`react-markdown`** for rendering the AI summary.
- **No state library** — React's built-ins are enough at this size.

---

## 7. Decisions (what I'm actually going to build)

| Concern | Choice | Why |
|---|---|---|
| Audio capture | Mic (always) + optional tab audio (Chrome) | Covers the realistic lecture/meeting case without native-app complexity |
| Transcription | **Whisper in the browser via transformers.js** (free, local) | 🆓 Zero cost per minute, best privacy story, no transcription API key needed |
| LLM | Concentrate API via server function | Dogfooding + required by assignment framing |
| Key management | Server function on Vercel, key in env var | Only safe pattern |
| Rate limiting | Per-IP + per-session + global spend cap in Vercel KV | Three independent brakes |
| Storage | IndexedDB (meetings, transcripts, audio) with "delete audio after transcript" default | Local-first = best privacy story |
| Front end | Vite + React + TS + Tailwind + Dexie | Fastest viable stack, best AI assistance |
| Hosting | Vercel Hobby | Free, simplest deploy, has KV |

### Things explicitly cut from v1
- Speaker diarization (who said what)
- Streaming transcription
- Multi-device sync / accounts
- Bring-your-own-key
- Calendar integration

These go in the "what I'd do next" section of the final write-up.

---

## 7b. Plan vs. what shipped

| Concern | Planned | Shipped | Why it changed |
|---|---|---|---|
| Audio capture | Mic + optional tab audio | **Mic only** | No interview signal for tab audio; cut as scope creep. Listed as future work |
| Whisper model | `whisper-base`, WebGPU with WASM fallback | **`Xenova/whisper-small.en`** (WASM, in a Web Worker) | `base` produced `[Music]` and junk on real lectures; English-only `small.en` was much cleaner. Real root cause of earlier junk was a missing 16 kHz resample |
| Responsiveness | Not planned | **Web Worker, 30 s chunks, progress %** | The main-thread version froze the UI on long audio. Not yet verified on a long recording |
| LLM call | `/chat/completions` | **Concentrate Responses API** (`POST /responses`, `output[].content[].text`), model `gpt-oss-120b` | The chat-completions shape I'd assumed was wrong; confirmed against the docs |
| Server function | Vercel serverless function | **Vercel Edge runtime** | A Fetch-style handler failed on the Node runtime (500) |
| Rate limiting | Per-IP + per-session + global cap in Vercel KV | **In-memory per-IP, 20/hr only** | Fastest thing that works. Resets on cold start and has **no global spend cap**. KV + cap is still to do; the free-tier model and a spend limit on the key are the stopgap |
| Storage | IndexedDB, delete audio by default | IndexedDB (Dexie): meetings, audio, reminders | Added reminders from interview feedback. Audio is not auto-deleted yet |
| Front end / hosting | Vite + React + TS + Tailwind + Dexie, Vercel | Same | Confirmed |

**Biggest lesson:** the research was right about the architecture (local transcription, server-side key) and wrong about specifics (model, API shape, runtime). The specifics were only found by running code.

---

## AI reflection
- **Where AI helped:** quick comparison tables for transcription APIs and hosting options; sanity-checking that `getDisplayMedia` tab-audio is still Chrome-only; drafting the server-function pattern.
- **Where it could harm (constitution):** AI confidently quoting prices or quotas that are outdated or wrong. A hallucinated "$0.001/min" from a confident paragraph could cost real money. **Mitigation:** every price and quota in this doc should be re-verified on the vendor's pricing page the day I buy, and I note in `ai-log.md` which numbers I checked.
- **Risks:** copy-pasting a code sample that leaks the key to the client without noticing. **Mitigation:** before deploy, I grep the built bundle for the string `CONCENTRATE` and confirm it's not there.
- **Where I chose not to use AI:** picking Vercel over Cloudflare — I know the deploy flow and don't want AI's preferences overriding mine for the sake of a demo. That's a judgment call, not a research question.
- **After building:** the prices and quotas I never needed to rely on (Whisper is local), but the API *shape* was a hallucination of exactly the kind I feared. It was caught by a 404 and a docs check, not by reviewing the code. The bundle-grep for the key is still on the pre-launch checklist.

Sources:
- [MDN: MediaDevices.getDisplayMedia()](https://ligm.univ-eiffel.fr/~forax/MDN/developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getDisplayMedia.html)
- [addpipe: tab audio with getDisplayMedia](https://addpipe.com/getdisplaymedia-demo/)
- [Chrome extensions: audio recording and screen capture](https://developer.chrome.com/docs/extensions/mv3/screen_capture)
- [Deepgram vs Whisper vs AssemblyAI 2026](https://www.pkgpulse.com/guides/deepgram-vs-openai-whisper-vs-assemblyai-speech-to-text-2026)
- [AssemblyAI vs Whisper pricing (2026)](https://costbench.com/compare/assemblyai-vs-openai-whisper/)
- [Deepgram vs Whisper pricing (2026)](https://costbench.com/compare/deepgram-vs-openai-whisper/)
- [Vercel rate limiting with Edge Middleware + KV](https://vercel.com/guides/rate-limiting-edge-middleware-vercel-kv)
- [Vercel WAF rate limiting SDK](https://vercel.com/docs/vercel-firewall/vercel-waf/rate-limiting-sdk)
- [IndexedDB max storage limit (rxdb)](https://rxdb.info/articles/indexeddb-max-storage-limit.html)
- [localStorage vs IndexedDB vs OPFS vs WASM-SQLite (rxdb)](https://rxdb.info/articles/localstorage-indexeddb-cookies-opfs-sqlite-wasm.md)
