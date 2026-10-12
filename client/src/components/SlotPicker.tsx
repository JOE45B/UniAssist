import { Spinner } from './DataState'
import type { Slot } from '../types'
import { formatRange, formatTime } from '../utils/format'

interface Props { loading: boolean; error: string | null; ready: boolean; booked: Slot[]; free: Slot[]; selectedStart: string; onPick: (slot: Slot) => void; prompt: string }

/** Shows live availability for the chosen resource and date; clicking a free slot fills the form. */
export default function SlotPicker({ loading, error, ready, booked, free, selectedStart, onPick, prompt }: Props) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3">
      <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Availability</p>
      {!ready ? <p className="mt-2 text-sm text-slate-500">{prompt}</p>
        : loading ? <p className="mt-2 flex items-center gap-2 text-sm text-slate-500"><Spinner className="h-4 w-4" />Checking availability…</p>
          : error ? <p className="mt-2 text-sm text-rose-700" role="alert">{error}</p>
            : (
              <>
                <p className="mt-2 text-sm text-slate-600">{booked.length ? <>Already booked: <b>{booked.map((b) => formatRange(b.startTime, b.endTime)).join(', ')}</b></> : 'Nothing is booked on this date yet.'}</p>
                {free.length === 0 ? <p className="mt-2 text-sm font-semibold text-rose-700">No free slots left on this date.</p> : (
                  <div className="mt-2 flex max-h-28 flex-wrap gap-1.5 overflow-y-auto">
                    {free.map((s) => (
                      <button key={s.startTime} type="button" onClick={() => onPick(s)}
                        className={`rounded-lg border px-2 py-1 text-xs font-semibold transition ${selectedStart === s.startTime ? 'border-indigo-600 bg-indigo-600 text-white' : 'border-slate-300 bg-white text-navy-900 hover:border-indigo-400'}`}>
                        {formatTime(s.startTime)}
                      </button>
                    ))}
                  </div>
                )}
              </>
            )}
    </div>
  )
}
