export type Role = 'student' | 'faculty' | 'admin'
export type Priority = 'low' | 'medium' | 'high'

export interface User {
  _id: string
  name: string
  email: string
  role: Role
  idNumber?: string
  department?: string
  program?: string
  yearLevel?: number
  isActive: boolean
  createdAt: string
}
export type UserRef = Pick<User, '_id' | 'name'> & Partial<Pick<User, 'email' | 'idNumber' | 'department' | 'role' | 'program'>>

export interface AuthResponse { token: string; user: User }

export interface Schedule {
  _id: string
  courseCode: string
  courseName: string
  instructor: string
  room: string
  day: string
  startTime: string
  endTime: string
}

export type TaskEffectiveStatus = 'pending' | 'completed' | 'overdue'
export interface Task {
  _id: string
  title: string
  description: string
  subject: string
  dueDate: string
  priority: Priority
  status: 'pending' | 'completed'
  effectiveStatus: TaskEffectiveStatus
  deadlineLabel: string
  daysLeft: number | null
  updatedAt: string
}
export interface TaskStats {
  total: number
  pending: number
  completed: number
  overdue: number
  dueToday: number
  dueSoon: number
  completionRate: number
  openByPriority: Record<Priority, number>
  bySubject: { subject: string; count: number }[]
}

export type RequestStatus = 'pending' | 'processing' | 'ready' | 'completed' | 'rejected' | 'cancelled'
export interface RequestHistory { status: RequestStatus; note: string; changedBy: UserRef | string; at: string }
export interface ServiceRequest {
  _id: string
  user: UserRef | string
  category: string
  title: string
  description: string
  priority: Priority
  status: RequestStatus
  submittedAt: string
  dueDate: string | null
  completedAt: string | null
  history: RequestHistory[]
  allowedTransitions: RequestStatus[]
  isOverdue: boolean
}
export interface RequestStats {
  total: number
  open: number
  overdue: number
  resolutionRate: number
  averageResolutionHours: number | null
  byStatus: Record<RequestStatus, number>
  byCategory: Record<string, number>
  openByPriority: Record<Priority, number>
}

export interface Slot { startTime: string; endTime: string }
export type AppointmentStatus = 'scheduled' | 'completed' | 'cancelled'
export interface Appointment {
  _id: string
  user: UserRef
  staff: UserRef
  department: string
  date: string
  startTime: string
  endTime: string
  purpose: string
  status: AppointmentStatus
}
export interface AppointmentAvailability { date: string; booked: Slot[]; freeSlots: Slot[]; officeHours: { open: string; close: string } }

export type ReservationStatus = 'confirmed' | 'completed' | 'cancelled'
export interface Reservation {
  _id: string
  user: UserRef
  facility: string
  facilityType: string
  date: string
  startTime: string
  endTime: string
  purpose: string
  status: ReservationStatus
}
export interface Facility { name: string; type: string; capacity: number }
export interface FacilityAvailability extends Facility { booked: Slot[]; freeSlots: Slot[]; available?: boolean }

export type AnnouncementState = 'upcoming' | 'active' | 'expired'
export interface Announcement {
  _id: string
  title: string
  content: string
  category: string
  priority: Priority
  publishDate: string
  expiryDate: string
  state: AnnouncementState
  createdBy?: UserRef
}

export interface CampusEvent {
  _id: string
  title: string
  description: string
  location: string
  date: string
  startTime: string
  endTime: string
  category: string
  capacity: number
  registeredCount: number
  remainingSlots: number
  isFull: boolean
  fillRate: number
  state: 'upcoming' | 'ongoing' | 'past'
  isRegistered: boolean
}
export interface EventStats {
  total: number
  upcoming: number
  past: number
  full: number
  totalCapacity: number
  totalRegistrations: number
  remainingSlots: number
  averageFillRate: number
  byCategory: Record<string, number>
  mostPopular: { _id: string; title: string; date: string; capacity: number; registeredCount: number; fillRate: number }[]
}

export interface Activity { type: string; id: string; title: string; detail: string; at: string; link: string }
export interface DashboardData {
  today: string
  dayName: string
  todayClasses: Schedule[]
  tasks: TaskStats & { upcoming: Task[] }
  serviceRequests: { total: number; open: number; overdue: number; byStatus: Record<RequestStatus, number> }
  upcomingAppointments: Appointment[]
  upcomingReservations: Reservation[]
  upcomingEvents: CampusEvent[]
  activeAnnouncements: Announcement[]
  recentActivity: Activity[]
}
export interface Analytics {
  users: { total: number; active: number; byRole: Record<Role, number> }
  schedules: { total: number }
  tasks: TaskStats
  serviceRequests: RequestStats
  appointments: { total: number; byStatus: Record<AppointmentStatus, number>; byDepartment: Record<string, number> }
  reservations: { total: number; byStatus: Record<ReservationStatus, number>; byFacilityType: Record<string, number>; topFacilities: { facility: string; count: number }[] }
  events: EventStats
  announcements: { total: number; upcoming: number; active: number; expired: number }
}
export interface SearchResponse {
  query: string
  total: number
  results: { tasks?: Task[]; schedules?: Schedule[]; requests?: ServiceRequest[]; events?: CampusEvent[]; announcements?: Announcement[] }
}
