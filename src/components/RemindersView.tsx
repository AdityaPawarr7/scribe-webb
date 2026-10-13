import { useState, type FormEvent } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import {
  createReminder,
  deleteReminder,
  listReminders,
  updateReminder,
  type Reminder,
  db
} from '../lib/db'
import { dueLabel } from '../lib/dueLabel'

export function RemindersView() {
  const data = useLiveQuery(() => listReminders(), [])
  const pending = data?.pending ?? []
  const done = data?.done ?? []
  const [text, setText] = useState('')
  const [due, setDue] = useState('') // yyyy-mm-dd

  async function onAdd(e: FormEvent) {
    e.preventDefault()
    const trimmed = text.trim()
    if (!trimmed) return
    await createReminder({
      text: trimmed,
      dueAt: due ? new Date(due + 'T09:00').getTime() : null
    })
    setText(''); setDue('')
  }

  return (
    <div>
      <div className="mb-4 flex items-baseline justify-between">
        <h2 className="text-base font-semibold">Reminders</h2>
        <span className="text-xs text-neutral-500 dark:text-neutral-400">
          {pending.length} open · {done.length} done
        </span>
      </div>

      <form onSubmit={onAdd} className="mb-5 flex flex-wrap items-center gap-2">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Something to remember…"
          className="flex-1 min-w-[220px] rounded-lg border border-neutral-200 bg-white/60 px-3 py-2 text-sm outline-none transition focus:border-neutral-400 focus:bg-white dark:border-neutral-800 dark:bg-neutral-900/40 dark:focus:bg-neutral-900"
        />
        <input
          type="date"
          value={due}
          onChange={(e) => setDue(e.target.value)}
          className="rounded-lg border border-neutral-200 bg-white/60 px-3 py-2 text-sm text-neutral-700 outline-none transition focus:border-neutral-400 focus:bg-white dark:border-neutral-800 dark:bg-neutral-900/40 dark:text-neutral-200 dark:focus:bg-neutral-900"
        />
        <button
          type="submit"
          disabled={!text.trim()}
          className="rounded-lg bg-neutral-900 px-3 py-2 text-sm font-medium text-white transition hover:bg-neutral-800 disabled:opacity-50 dark:bg-neutral-100 dark:text-neutral-900 dark:hover:bg-white"
        >
          Add
        </button>
      </form>

      {pending.length === 0 && done.length === 0 ? (
        <Empty />
      ) : (
        <>
          <Section title="Open" items={pending} />
          {done.length > 0 && <Section title="Done" items={done} dim />}
        </>
      )}
    </div>
  )
}

function Section({
  title,
  items,
  dim = false
}: {
  title: string
  items: Reminder[]
  dim?: boolean
}) {
  if (items.length === 0) return null
  return (
    <div className={dim ? 'mt-6 opacity-60' : ''}>
      <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
        {title}
      </h3>
      <ul className="space-y-1.5">
        {items.map((r) => <Row key={r.id} r={r} />)}
      </ul>
    </div>
  )
}

function Row({ r }: { r: Reminder }) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(r.text)
  const [draftDue, setDraftDue] = useState(
    r.dueAt ? new Date(r.dueAt).toISOString().slice(0, 10) : ''
  )
  const dueMeta = r.dueAt ? dueLabel(r.dueAt, r.done) : null
  const sourceMeetingTitle = useLiveQuery(
    async () => {
      if (!r.meetingId) return null
      const m = await db.meetings.get(r.meetingId)
      return m?.title ?? null
    },
    [r.meetingId]
  )
  return (
    <li className="group rounded-xl border border-neutral-200 bg-white/60 px-3 py-2 transition hover:border-neutral-300 dark:border-neutral-800 dark:bg-neutral-900/40 dark:hover:border-neutral-700">
      <div className="flex items-start gap-2.5">
        <input
          type="checkbox"
          checked={r.done}
          onChange={() => updateReminder(r.id, { done: !r.done })}
          className="mt-1 h-4 w-4 cursor-pointer accent-neutral-900 dark:accent-neutral-100"
        />
        <div className="min-w-0 flex-1">
          {editing ? (
            <div className="flex flex-wrap gap-2">
              <input
                autoFocus
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                className="flex-1 min-w-[180px] rounded-md border border-neutral-200 bg-white px-2 py-1 text-sm outline-none focus:border-neutral-400 dark:border-neutral-700 dark:bg-neutral-900"
              />
              <input
                type="date"
                value={draftDue}
                onChange={(e) => setDraftDue(e.target.value)}
                className="rounded-md border border-neutral-200 bg-white px-2 py-1 text-sm outline-none focus:border-neutral-400 dark:border-neutral-700 dark:bg-neutral-900"
              />
              <button
                onClick={async () => {
                  await updateReminder(r.id, {
                    text: draft.trim() || r.text,
                    dueAt: draftDue ? new Date(draftDue + 'T09:00').getTime() : null
                  })
                  setEditing(false)
                }}
                className="rounded-md bg-neutral-900 px-2 py-1 text-xs text-white dark:bg-neutral-100 dark:text-neutral-900"
              >
                Save
              </button>
              <button
                onClick={() => { setDraft(r.text); setEditing(false) }}
                className="rounded-md border border-neutral-200 px-2 py-1 text-xs dark:border-neutral-700"
              >
                Cancel
              </button>
            </div>
          ) : (
            <>
              <div className={`text-sm leading-snug ${r.done ? 'line-through text-neutral-400' : ''}`}>
                {r.text}
              </div>
              <div className="mt-0.5 flex flex-wrap gap-x-2 gap-y-0.5 text-[11px] text-neutral-500 dark:text-neutral-400">
                {dueMeta && <span className={dueMeta.tone}>{dueMeta.label}</span>}
                {sourceMeetingTitle && (
                  <span className="truncate">from "{sourceMeetingTitle}"</span>
                )}
              </div>
            </>
          )}
        </div>
        {!editing && (
          <div className="flex gap-1 opacity-0 transition group-hover:opacity-100">
            <button
              onClick={() => setEditing(true)}
              title="Edit"
              className="rounded px-1.5 py-0.5 text-xs text-neutral-500 hover:bg-neutral-100 dark:text-neutral-400 dark:hover:bg-neutral-800"
            >
              Edit
            </button>
            <button
              onClick={async () => {
                if (confirm(`Delete "${r.text}"?`)) await deleteReminder(r.id)
              }}
              title="Delete"
              className="rounded px-1.5 py-0.5 text-xs text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/40"
            >
              Delete
            </button>
          </div>
        )}
      </div>
    </li>
  )
}

function Empty() {
  return (
    <div className="rounded-xl border border-dashed border-neutral-200 p-10 text-center text-sm text-neutral-500 dark:border-neutral-800 dark:text-neutral-400">
      No reminders yet. Add one above, or open a meeting and use the "+ reminder" button on the enhanced notes.
    </div>
  )
}
