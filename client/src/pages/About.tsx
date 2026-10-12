import { Link } from 'react-router-dom'
import Icon from '../components/Icon'
import type { IconName } from '../components/Icon'

const ROLES: { icon: IconName; title: string; text: string }[] = [
  { icon: 'cap', title: 'Students', text: 'Manage a weekly class schedule, track tasks and deadlines, file service requests, book appointments, reserve facilities and register for events.' },
  { icon: 'users', title: 'Faculty and staff', text: 'Process service requests through a controlled status workflow, manage appointments and reservations, and publish events and announcements.' },
  { icon: 'shield', title: 'Administrators', text: 'Everything staff can do, plus user management and campus-wide analytics computed from live records.' },
]
const LOGIC = [
  ['Deadline tracking', 'A task is overdue only when its due date has passed and it is not completed. Due today, tomorrow and soon are calculated on the server.'],
  ['Conflict detection', 'Two time ranges conflict when one starts before the other ends and ends after the other starts. Classes, appointments and reservations all use this rule.'],
  ['Safe bookings', 'Every booked 15-minute slot is protected by a unique database index, so two people can never hold the same staff member or room at the same time.'],
  ['Request workflow', 'Service requests move pending → processing → ready → completed. The server rejects any jump that skips or reverses the workflow.'],
  ['Event capacity', 'Remaining slots are capacity minus actual registrations. Registration fails when an event is full and you cannot register twice.'],
  ['Announcement states', 'Upcoming, active and expired are derived from publish and expiry dates. Students only ever see active announcements.'],
]
const STACK = ['React', 'Vite', 'TypeScript', 'Tailwind CSS', 'React Router', 'React Hook Form', 'Zod', 'Axios', 'Node.js', 'Express', 'MongoDB', 'Mongoose']

export default function About() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
      <p className="eyebrow">About the project</p>
      <h1 className="mt-1 max-w-3xl text-4xl">A campus assistant that does the checking for you</h1>
      <p className="mt-4 max-w-3xl text-lg text-slate-600">UniAssist is a University Student Services and Campus Assistant. It brings schedules, deadlines, service requests, appointments, facility reservations, events and announcements into one place — and applies real rules to that data instead of only storing it.</p>

      <h2 className="mt-14 text-2xl">Who it is for</h2>
      <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-3">
        {ROLES.map((r) => (
          <div key={r.title} className="card p-5">
            <span className="grid h-11 w-11 place-items-center rounded-xl bg-violet-50 text-violet-600"><Icon name={r.icon} /></span>
            <h3 className="mt-4 text-lg">{r.title}</h3>
            <p className="mt-1 text-sm text-slate-600">{r.text}</p>
          </div>
        ))}
      </div>

      <h2 className="mt-14 text-2xl">The rules behind the screens</h2>
      <dl className="mt-5 grid grid-cols-1 gap-x-8 gap-y-6 md:grid-cols-2">
        {LOGIC.map(([title, text]) => (
          <div key={title} className="border-l-2 border-indigo-200 pl-4">
            <dt className="font-bold text-navy-900">{title}</dt>
            <dd className="mt-1 text-sm text-slate-600">{text}</dd>
          </div>
        ))}
      </dl>

      <h2 className="mt-14 text-2xl">Built with</h2>
      <ul className="mt-4 flex flex-wrap gap-2">
        {STACK.map((s) => <li key={s} className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-sm font-semibold text-navy-900">{s}</li>)}
      </ul>

      <div className="mt-14 flex flex-col gap-3 sm:flex-row">
        <Link to="/register" className="btn-primary">Create an account</Link>
        <Link to="/login" className="btn-secondary">Sign in</Link>
      </div>
    </div>
  )
}
