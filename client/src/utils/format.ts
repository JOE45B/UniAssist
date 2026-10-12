const pad = (n: number) => String(n).padStart(2, '0')

/** Local calendar date as YYYY-MM-DD (for <input type="date">). */
export const toDateInput = (d: Date = new Date()) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
/** Local date-time as YYYY-MM-DDTHH:mm (for <input type="datetime-local">). */
export const toDateTimeInput = (value: string | Date) => {
  const d = new Date(value)
  return `${toDateInput(d)}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export const formatDate = (value: string | Date) =>
  new Date(typeof value === 'string' && value.length === 10 ? `${value}T00:00:00` : value).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })

export const formatWeekday = (dateStr: string) => new Date(`${dateStr}T00:00:00`).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })

export const formatDateTime = (value: string | Date) =>
  new Date(value).toLocaleString(undefined, { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })

export function formatTime(hhmm: string) {
  const [h, m] = hhmm.split(':').map(Number)
  return `${h % 12 || 12}:${pad(m)} ${h < 12 ? 'AM' : 'PM'}`
}
export const formatRange = (start: string, end: string) => `${formatTime(start)} – ${formatTime(end)}`

export function timeAgo(value: string) {
  const mins = Math.round((Date.now() - new Date(value).getTime()) / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  if (mins < 1440) return `${Math.round(mins / 60)}h ago`
  return `${Math.round(mins / 1440)}d ago`
}

export const toMinutes = (hhmm: string) => { const [h, m] = hhmm.split(':').map(Number); return h * 60 + m }
export const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)

/** 15-minute time options between two HH:mm bounds, for <select>. */
export function timeOptions(open: string, close: string, step = 15) {
  const out: string[] = []
  for (let m = toMinutes(open); m <= toMinutes(close); m += step) out.push(`${pad(Math.floor(m / 60))}:${pad(m % 60)}`)
  return out
}
