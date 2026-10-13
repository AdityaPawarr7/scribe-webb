import { useEffect, useMemo, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import ReactMarkdown from 'react-markdown'
import {
  createMeeting,
  createReminder,
  deleteMeeting,
  listMeetings,
  updateMeeting,
  type Meeting,
  db
} from './lib/db'
import { RemindersView } from './components/RemindersView'
import { Recorder } from './lib/recorder'
import { transcribe, type LoadProgress } from './lib/transcribe'

type Status =
  | 'idle'
  | 'recording'
  | 'transcribing'
  | 'summarizing'
  | 'done'
  | 'error'
type Tab = 'enhanced' | 'raw'

export default function App() {
  const meetings = useLiveQuery(() => listMeetings(), []) ?? []
  const [view, setView] = useState<'meetings' | 'reminders'>('meetings')
  const [currentId, setCurrentId] = useState<string | null>(null)
  const [status, setStatus] = useState<Status>('idle')
  const [modelProgress, setModelProgress] = useState<LoadProgress | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [recorder] = useState(() => new Recorder())
  const [tab, setTab] = useState<Tab>('enhanced')
  const [elapsed, setElapsed] = useState(0)
  const current = useMemo(
    () => meetings.find((m) => m.id === currentId) ?? null,
    [meetings, currentId]
  )

  useEffect(() => {
    if (!currentId && meetings[0]) setCurrentId(meetings[0].id)
  }, [meetings, currentId])

  // ticking timer while recording
  useEffect(() => {
    if (status !== 'recording') return
    const start = Date.now()
    const id = setInterval(() => setElapsed((Date.now() - start) / 1000), 250)
    return () => clearInterval(id)
  }, [status])

  async function onRecord() {
    try {
      setError(null)
      if (status === 'recording') {
        // STOP: attach to the open meeting if there is one (notes you already typed),
        // otherwise create a fresh meeting now (false starts leave nothing behind).
        setStatus('transcribing')
        const rec = await recorder.stop()
        const m = current ?? (await createMeeting())
        if (!current) setCurrentId(m.id)
        await db.audio.put({ id: m.id, blob: rec.blob })
        await updateMeeting(m.id, {
          hasAudio: true,
          durationSec: rec.durationSec
        })

        const text = await transcribe(rec.blob, setModelProgress)
        await updateMeeting(m.id, { transcript: [{ t: 0, text }] })

        setStatus('summarizing')
        const latest = await db.meetings.get(m.id)
        const res = await fetch('/api/summarize', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            transcript: text,
            notes: latest?.notes ?? '',
            template: 'generic meeting'
          })
        })
        if (res.ok) {
          const { markdown } = (await res.json()) as { markdown: string }
          const title = markdown.match(/^#\s+(.+)$/m)?.[1]?.trim()
          await updateMeeting(m.id, {
            enhancedNotes: markdown,
            title: title || 'Untitled meeting'
          })
        } else {
          const detail = await res.text()
          setError(`Summary failed (${res.status}): ${detail.slice(0, 200)}`)
        }
        setStatus('done')
      } else {
        setElapsed(0)
        await recorder.start()
        setStatus('recording')
      }
    } catch (e) {
      setStatus('error')
      setError(e instanceof Error ? e.message : String(e))
    }
  }

  return (
    <div className="mx-auto grid min-h-screen max-w-[1200px] grid-cols-[260px_1fr] gap-5 p-5">
      <Sidebar
        meetings={meetings}
        currentId={currentId}
        view={view}
        onViewChange={setView}
        onSelect={(id) => { setCurrentId(id); setView('meetings') }}
        onNew={async () => {
          const m = await createMeeting()
          setCurrentId(m.id)
          setView('meetings')
        }}
      />
      <main className="rounded-2xl border border-neutral-200/70 bg-white/70 p-5 shadow-sm backdrop-blur dark:border-neutral-800 dark:bg-neutral-900/60">
        {view === 'meetings' && (
          <Toolbar
            status={status}
            elapsed={elapsed}
            modelProgress={modelProgress}
            onRecord={onRecord}
            canDelete={!!current}
            onDelete={async () => {
              if (!current) return
              if (!confirm(`Delete "${current.title}"?`)) return
              await deleteMeeting(current.id)
              setCurrentId(null)
            }}
          />
        )}
        {error && <ErrorBanner message={error} onDismiss={() => setError(null)} />}
        {view === 'reminders' ? (
          <RemindersView />
        ) : current ? (
          <MeetingView meeting={current} tab={tab} onTabChange={setTab} />
        ) : (
          <Empty status={status} />
        )}
      </main>
    </div>
  )
}

/* ───── Sidebar ───── */

function Sidebar({
  meetings,
  currentId,
  view,
  onViewChange,
  onSelect,
  onNew
}: {
  meetings: Meeting[]
  currentId: string | null
  view: 'meetings' | 'reminders'
  onViewChange: (v: 'meetings' | 'reminders') => void
  onSelect: (id: string) => void
  onNew: () => void
}) {
  return (
    <aside className="rounded-2xl border border-neutral-200/70 bg-white/70 p-3 shadow-sm backdrop-blur dark:border-neutral-800 dark:bg-neutral-900/60">
      <div className="mb-3 flex items-center gap-2 px-1 pt-1">
        <LogoDot />
        <h1 className="text-sm font-semibold tracking-tight">Scribe · web</h1>
      </div>
      <div className="mb-3 flex gap-1 rounded-lg bg-neutral-100/80 p-1 dark:bg-neutral-800/70">
        <SideTab active={view === 'meetings'} onClick={() => onViewChange('meetings')}>
          Meetings
        </SideTab>
        <SideTab active={view === 'reminders'} onClick={() => onViewChange('reminders')}>
          Reminders
        </SideTab>
      </div>
      {view === 'meetings' && (
        <div className="mb-2 flex items-center justify-between px-1">
          <span className="text-[11px] text-neutral-500 dark:text-neutral-400">
            Local-first · nothing uploaded
          </span>
          <button
            onClick={onNew}
            title="New meeting"
            className="rounded-md border border-neutral-200 px-2 py-0.5 text-xs text-neutral-600 transition hover:bg-neutral-100 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800/70"
          >
            + new
          </button>
        </div>
      )}
      {view === 'meetings' && (meetings.length === 0 ? (
        <div className="rounded-lg bg-neutral-100/60 px-2 py-3 text-xs text-neutral-500 dark:bg-neutral-800/50 dark:text-neutral-400">
          Nothing yet. Hit <b>Record</b> to start.
        </div>
      ) : (
        <ul className="space-y-0.5">
          {meetings.map((m) => (
            <li key={m.id}>
              <button
                onClick={() => onSelect(m.id)}
                className={`group w-full rounded-lg px-2.5 py-2 text-left transition ${
                  currentId === m.id
                    ? 'bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900'
                    : 'hover:bg-neutral-100 dark:hover:bg-neutral-800/70'
                }`}
              >
                <div className="truncate text-sm font-medium">{m.title}</div>
                <div className="mt-0.5 flex items-center gap-1.5 text-[11px] opacity-70">
                  <span>{formatDate(m.createdAt)}</span>
                  <span>·</span>
                  <span>{formatDuration(m.durationSec)}</span>
                </div>
              </button>
            </li>
          ))}
        </ul>
      ))}
    </aside>
  )
}

function SideTab({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`flex-1 rounded-md px-2 py-1 text-xs font-medium transition ${
        active
          ? 'bg-white text-neutral-900 shadow-sm dark:bg-neutral-700 dark:text-neutral-100'
          : 'text-neutral-500 hover:text-neutral-800 dark:text-neutral-400 dark:hover:text-neutral-100'
      }`}
    >
      {children}
    </button>
  )
}

function LogoDot() {
  return (
    <span className="relative inline-flex h-6 w-6 items-center justify-center rounded-md bg-neutral-900 text-xs font-bold text-white dark:bg-neutral-100 dark:text-neutral-900">
      S
    </span>
  )
}

/* ───── Toolbar ───── */

function Toolbar({
  status,
  elapsed,
  modelProgress,
  onRecord,
  canDelete,
  onDelete
}: {
  status: Status
  elapsed: number
  modelProgress: LoadProgress | null
  onRecord: () => void
  canDelete: boolean
  onDelete: () => void
}) {
  const busy = status === 'transcribing' || status === 'summarizing'
  const label =
    status === 'recording'
      ? `Stop · ${formatDuration(elapsed)}`
      : busy
      ? 'Working…'
      : 'Record'
  return (
    <div className="mb-4 flex items-center gap-3">
      <button
        onClick={onRecord}
        disabled={busy}
        className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium text-white shadow-sm transition disabled:cursor-wait disabled:opacity-60 ${
          status === 'recording'
            ? 'bg-red-600 hover:bg-red-500'
            : 'bg-neutral-900 hover:bg-neutral-800 dark:bg-neutral-100 dark:text-neutral-900 dark:hover:bg-white'
        }`}
      >
        <RecordDot recording={status === 'recording'} />
        {label}
      </button>
      <StatusPill status={status} progress={modelProgress} />
      {canDelete && (
        <button
          onClick={onDelete}
          className="ml-auto rounded-lg border border-neutral-200 px-2.5 py-1.5 text-xs text-neutral-700 transition hover:bg-neutral-100 dark:border-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-800/70"
        >
          Delete
        </button>
      )}
    </div>
  )
}

function RecordDot({ recording }: { recording: boolean }) {
  return (
    <span className="relative inline-flex h-2.5 w-2.5">
      {recording && (
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white/70 opacity-75" />
      )}
      <span
        className={`relative inline-flex h-2.5 w-2.5 rounded-full ${
          recording ? 'bg-white' : 'bg-red-500 dark:bg-red-400'
        }`}
      />
    </span>
  )
}

function StatusPill({
  status,
  progress
}: {
  status: Status
  progress: LoadProgress | null
}) {
  const label =
    status === 'idle'
      ? 'ready'
      : status === 'recording'
      ? 'recording · audio stays local'
      : status === 'transcribing'
      ? progress?.status === 'downloading'
        ? `downloading model ${Math.round(progress.progress ?? 0)}%`
        : 'transcribing locally…'
      : status === 'summarizing'
      ? 'enhancing with Concentrate…'
      : status === 'done'
      ? 'done'
      : 'error'
  const tone =
    status === 'error'
      ? 'border-red-300 text-red-700 dark:border-red-900 dark:text-red-300'
      : status === 'done'
      ? 'border-emerald-300 text-emerald-700 dark:border-emerald-900 dark:text-emerald-300'
      : 'border-neutral-200 text-neutral-500 dark:border-neutral-800 dark:text-neutral-400'
  return (
    <span className={`rounded-full border px-2.5 py-0.5 text-[11px] ${tone}`}>
      {label}
    </span>
  )
}

/* ───── Meeting view ───── */

function MeetingView({
  meeting,
  tab,
  onTabChange
}: {
  meeting: Meeting
  tab: Tab
  onTabChange: (t: Tab) => void
}) {
  return (
    <div className="grid grid-cols-5 gap-5">
      <section className="col-span-2 flex min-h-[32rem] flex-col">
        <Label>My notes</Label>
        <textarea
          value={meeting.notes}
          onChange={(e) => updateMeeting(meeting.id, { notes: e.target.value })}
          placeholder="Jot the things you care about while you talk."
          className="h-56 w-full resize-none rounded-xl border border-neutral-200 bg-white/60 p-3 text-sm leading-relaxed outline-none transition focus:border-neutral-400 focus:bg-white dark:border-neutral-800 dark:bg-neutral-900/40 dark:focus:bg-neutral-900"
        />
        <div className="mt-5">
          <Label>Transcript</Label>
          <div className="h-56 overflow-auto rounded-xl border border-neutral-200 bg-neutral-50/80 p-3 text-sm leading-relaxed dark:border-neutral-800 dark:bg-neutral-950/60">
            {meeting.transcript[0]?.text ?? (
              <span className="text-neutral-400">—</span>
            )}
          </div>
        </div>
      </section>
      <section className="col-span-3 flex min-h-[32rem] flex-col">
        <div className="mb-1.5 flex items-center justify-between gap-2">
          <Label className="!mb-0">Enhanced notes</Label>
          <div className="flex items-center gap-2">
            <button
              onClick={async () => {
                const seed = meeting.title && meeting.title !== 'Untitled meeting'
                  ? `Follow up on: ${meeting.title}`
                  : 'Follow up on this meeting'
                const text = prompt('New reminder', seed)
                if (!text) return
                await createReminder({ text, meetingId: meeting.id })
                alert('Reminder added — see the Reminders tab.')
              }}
              className="rounded-md border border-neutral-200 px-2 py-0.5 text-[11px] text-neutral-600 transition hover:bg-neutral-100 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800/70"
              title="Create a reminder linked to this meeting"
            >
              + reminder
            </button>
            <div className="flex gap-1 rounded-lg border border-neutral-200 p-0.5 text-[11px] dark:border-neutral-800">
              <TabBtn active={tab === 'enhanced'} onClick={() => onTabChange('enhanced')}>
                Rendered
              </TabBtn>
              <TabBtn active={tab === 'raw'} onClick={() => onTabChange('raw')}>
                Raw
              </TabBtn>
            </div>
          </div>
        </div>
        {tab === 'enhanced' ? (
          <div className="prose-notes h-full overflow-auto rounded-xl border border-neutral-200 bg-white/60 p-5 dark:border-neutral-800 dark:bg-neutral-900/40">
            {meeting.enhancedNotes ? (
              <ReactMarkdown>{meeting.enhancedNotes}</ReactMarkdown>
            ) : (
              <p className="text-sm text-neutral-400">
                The AI summary lands here after you stop recording.
              </p>
            )}
          </div>
        ) : (
          <textarea
            value={meeting.enhancedNotes}
            onChange={(e) =>
              updateMeeting(meeting.id, { enhancedNotes: e.target.value })
            }
            placeholder="The AI summary lands here after you stop recording."
            className="h-full w-full resize-none rounded-xl border border-neutral-200 bg-white/60 p-4 font-mono text-xs leading-relaxed outline-none transition focus:border-neutral-400 focus:bg-white dark:border-neutral-800 dark:bg-neutral-900/40 dark:focus:bg-neutral-900"
          />
        )}
      </section>
    </div>
  )
}

function Label({
  children,
  className = ''
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <h2
      className={`mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400 ${className}`}
    >
      {children}
    </h2>
  )
}

function TabBtn({
  active,
  onClick,
  children
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      className={`rounded-md px-2 py-0.5 font-medium transition ${
        active
          ? 'bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900'
          : 'text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-100'
      }`}
    >
      {children}
    </button>
  )
}

/* ───── misc ───── */

function Empty({ status }: { status: Status }) {
  const msg =
    status === 'recording'
      ? 'Listening. Speak freely — audio stays on your device.'
      : status === 'transcribing'
      ? 'Transcribing locally…'
      : status === 'summarizing'
      ? 'Enhancing notes…'
      : 'Hit Record to start a meeting.'
  return (
    <div className="grid h-80 place-items-center">
      <div className="text-center">
        <div className="mx-auto mb-3 h-10 w-10 rounded-full bg-neutral-100 dark:bg-neutral-800" />
        <p className="text-sm text-neutral-500">{msg}</p>
      </div>
    </div>
  )
}

function ErrorBanner({
  message,
  onDismiss
}: {
  message: string
  onDismiss: () => void
}) {
  return (
    <div className="mb-3 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-900 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-200">
      <span className="mt-0.5">⚠️</span>
      <div className="flex-1 whitespace-pre-wrap break-words">{message}</div>
      <button
        onClick={onDismiss}
        className="text-xs opacity-70 hover:opacity-100"
        aria-label="Dismiss"
      >
        ✕
      </button>
    </div>
  )
}

/* ───── format helpers ───── */

function formatDuration(sec: number): string {
  if (!sec || sec < 1) return '0:00'
  const m = Math.floor(sec / 60)
  const s = Math.floor(sec % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}

function formatDate(ts: number): string {
  const d = new Date(ts)
  const now = new Date()
  const sameDay = d.toDateString() === now.toDateString()
  if (sameDay) {
    return d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
  }
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}
