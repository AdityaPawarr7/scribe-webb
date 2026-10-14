import { useState } from 'react'
import { createReminder } from '../lib/db'
import { fromDateInputValue, toDateInputValue } from '../lib/dates'
import type { Suggestion } from '../lib/suggest'

interface Row {
  key: string
  checked: boolean
  text: string
  due: string // yyyy-mm-dd (local) or ''
  owner: string | null
  phrase: string | null
}

/**
 * Reminders Scribe found in a meeting's action items. The user reviews, edits and chooses;
 * nothing is saved until "Add" is pressed.
 */
export function SuggestedReminders({
  meetingId,
  items,
  onClose,
  onOpenReminders
}: {
  meetingId: string
  items: Suggestion[]
  onClose: () => void
  onOpenReminders: () => void
}) {
  const [rows, setRows] = useState<Row[]>(() =>
    items.map((s) => ({
      key: s.key,
      checked: true,
      text: s.text,
      due: toDateInputValue(s.dueAt),
      owner: s.owner,
      phrase: s.phrase
    }))
  )
  const [added, setAdded] = useState<number | null>(null)

  const patch = (key: string, p: Partial<Row>) =>
    setRows((rs) => rs.map((r) => (r.key === key ? { ...r, ...p } : r)))
  const selected = rows.filter((r) => r.checked && r.text.trim())

  async function addSelected() {
    for (const r of selected) {
      await createReminder({ text: r.text.trim(), dueAt: fromDateInputValue(r.due), meetingId })
    }
    setAdded(selected.length)
  }

  const shell =
    'mb-3 rounded-xl border border-amber-300/60 bg-amber-50/70 p-3 text-sm dark:border-amber-500/30 dark:bg-amber-500/5'

  if (added !== null) {
    return (
      <div className={shell} role="status">
        <div className="flex items-center justify-between gap-3">
          <span>
            Added {added} reminder{added === 1 ? '' : 's'}.
          </span>
          <div className="flex gap-2">
            <button onClick={onOpenReminders} className={btn}>View reminders</button>
            <button onClick={onClose} className={btn}>Close</button>
          </div>
        </div>
      </div>
    )
  }

  if (rows.length === 0) {
    return (
      <div className={shell} role="status">
        <div className="flex items-center justify-between gap-3">
          <span className="text-neutral-600 dark:text-neutral-300">
            No new action items to turn into reminders.
          </span>
          <button onClick={onClose} className={btn}>Close</button>
        </div>
      </div>
    )
  }

  return (
    <div className={shell}>
      <div className="mb-2 flex items-baseline justify-between gap-3">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-wider text-amber-700 dark:text-amber-400">
            Suggested reminders
          </div>
          <div className="text-xs text-neutral-500 dark:text-neutral-400">
            From the action items. Edit anything; nothing is saved until you add.
          </div>
        </div>
        <button onClick={onClose} className={btn} title="Dismiss without adding">Dismiss</button>
      </div>

      <ul className="space-y-1.5">
        {rows.map((r) => (
          <li key={r.key} className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={r.checked}
              onChange={(e) => patch(r.key, { checked: e.target.checked })}
              className="h-4 w-4 shrink-0 cursor-pointer accent-neutral-900 dark:accent-neutral-100"
              aria-label="Include this reminder"
            />
            <input
              value={r.text}
              onChange={(e) => patch(r.key, { text: e.target.value })}
              className="min-w-0 flex-1 rounded-md border border-neutral-200 bg-white/80 px-2 py-1 text-sm outline-none focus:border-neutral-400 dark:border-neutral-700 dark:bg-neutral-900/60"
            />
            {r.owner && (
              <span className="shrink-0 rounded-full bg-neutral-200/70 px-2 py-0.5 text-[10px] text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300">
                {r.owner}
              </span>
            )}
            <input
              type="date"
              value={r.due}
              onChange={(e) => patch(r.key, { due: e.target.value })}
              title={r.phrase ? `Read from "${r.phrase}"` : 'No date found. Pick one if you want.'}
              className="shrink-0 rounded-md border border-neutral-200 bg-white/80 px-2 py-1 text-xs outline-none focus:border-neutral-400 dark:border-neutral-700 dark:bg-neutral-900/60"
            />
          </li>
        ))}
      </ul>

      <div className="mt-3 flex items-center justify-between">
        <button
          onClick={() => {
            const all = rows.every((r) => r.checked)
            setRows((rs) => rs.map((r) => ({ ...r, checked: !all })))
          }}
          className="text-[11px] text-neutral-500 underline-offset-2 hover:underline dark:text-neutral-400"
        >
          {rows.every((r) => r.checked) ? 'Select none' : 'Select all'}
        </button>
        <button
          onClick={addSelected}
          disabled={selected.length === 0}
          className="rounded-md bg-neutral-900 px-3 py-1 text-xs font-medium text-white transition enabled:hover:bg-neutral-700 disabled:opacity-40 dark:bg-neutral-100 dark:text-neutral-900 dark:enabled:hover:bg-neutral-300"
        >
          Add {selected.length} reminder{selected.length === 1 ? '' : 's'}
        </button>
      </div>
    </div>
  )
}

const btn =
  'rounded-md border border-neutral-200 px-2 py-0.5 text-[11px] text-neutral-600 transition hover:bg-neutral-100 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800/70'
