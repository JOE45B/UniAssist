import { z } from 'zod'
import { ANNOUNCEMENT_CATEGORIES, DAYS, DEPARTMENTS, EVENT_CATEGORIES, PRIORITIES, REQUEST_CATEGORIES, ROLES } from '../utils/constants'
import { toDateInput, toMinutes } from '../utils/format'

const time = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Choose a time')
const dateStr = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Choose a date')
const notPast = dateStr.refine((d) => d >= toDateInput(), 'Date cannot be in the past')
const dateTime = z.string().min(1, 'Choose a date and time').refine((v) => !Number.isNaN(new Date(v).getTime()), 'Enter a valid date and time')
const priority = z.enum(PRIORITIES, 'Choose a priority')
const endAfterStart = (v: { startTime: string; endTime: string }) => !v.startTime || !v.endTime || toMinutes(v.endTime) > toMinutes(v.startTime)
const END_MSG = { message: 'End time must be later than start time', path: ['endTime'] }

export const loginSchema = z.object({
  email: z.email('Enter a valid email address'),
  password: z.string().min(1, 'Enter your password'),
})
export type LoginValues = z.infer<typeof loginSchema>

export const registerSchema = z.object({
  name: z.string().trim().min(2, 'Enter your full name').max(80),
  email: z.email('Enter a valid email address'),
  idNumber: z.string().trim().max(20, 'Keep it under 20 characters'),
  program: z.string().trim().max(80),
  password: z.string().min(8, 'Use at least 8 characters'),
  confirmPassword: z.string(),
}).refine((v) => v.password === v.confirmPassword, { message: 'Passwords do not match', path: ['confirmPassword'] })
export type RegisterValues = z.infer<typeof registerSchema>

export const scheduleSchema = z.object({
  courseCode: z.string().trim().min(2, 'Enter the course code').max(20),
  courseName: z.string().trim().min(2, 'Enter the course name').max(120),
  instructor: z.string().trim().min(2, 'Enter the instructor').max(80),
  room: z.string().trim().min(1, 'Enter the room').max(40),
  day: z.enum(DAYS, 'Choose a day'),
  startTime: time,
  endTime: time,
}).refine(endAfterStart, END_MSG)
export type ScheduleValues = z.infer<typeof scheduleSchema>

export const taskSchema = z.object({
  title: z.string().trim().min(3, 'Title must be at least 3 characters').max(120),
  subject: z.string().trim().min(1, 'Enter the subject').max(60),
  description: z.string().trim().max(1000, 'Keep it under 1000 characters'),
  dueDate: dateTime,
  priority,
  status: z.enum(['pending', 'completed']),
})
export type TaskValues = z.infer<typeof taskSchema>

export const requestSchema = z.object({
  category: z.enum(REQUEST_CATEGORIES, 'Choose a category'),
  title: z.string().trim().min(5, 'Title must be at least 5 characters').max(120),
  description: z.string().trim().min(10, 'Describe the request in at least 10 characters').max(2000),
  priority,
  dueDate: z.string().refine((v) => v === '' || v >= toDateInput(), 'Needed-by date cannot be in the past'),
})
export type RequestValues = z.infer<typeof requestSchema>

export const appointmentSchema = z.object({
  department: z.enum(DEPARTMENTS, 'Choose a department'),
  staff: z.string().min(1, 'Choose a staff member'),
  date: notPast,
  startTime: time,
  endTime: time,
  purpose: z.string().trim().min(5, 'Purpose must be at least 5 characters').max(500),
}).refine(endAfterStart, END_MSG)
export type AppointmentValues = z.infer<typeof appointmentSchema>

export const reservationSchema = z.object({
  facility: z.string().min(1, 'Choose a facility'),
  date: notPast,
  startTime: time,
  endTime: time,
  purpose: z.string().trim().min(5, 'Purpose must be at least 5 characters').max(500),
}).refine(endAfterStart, END_MSG)
export type ReservationValues = z.infer<typeof reservationSchema>

export const eventSchema = z.object({
  title: z.string().trim().min(5, 'Title must be at least 5 characters').max(140),
  description: z.string().trim().min(10, 'Description must be at least 10 characters').max(3000),
  location: z.string().trim().min(2, 'Enter the location').max(120),
  date: dateStr,
  startTime: time,
  endTime: time,
  category: z.enum(EVENT_CATEGORIES, 'Choose a category'),
  capacity: z.number('Enter a number').int('Use a whole number').min(1, 'Capacity must be at least 1').max(10000, 'Capacity cannot exceed 10,000'),
}).refine(endAfterStart, END_MSG)
export type EventValues = z.infer<typeof eventSchema>

export const announcementSchema = z.object({
  title: z.string().trim().min(5, 'Title must be at least 5 characters').max(140),
  content: z.string().trim().min(10, 'Content must be at least 10 characters').max(3000),
  category: z.enum(ANNOUNCEMENT_CATEGORIES, 'Choose a category'),
  priority,
  publishDate: dateTime,
  expiryDate: dateTime,
}).refine((v) => !v.publishDate || !v.expiryDate || new Date(v.expiryDate) > new Date(v.publishDate), { message: 'Expiry must be after the publish date', path: ['expiryDate'] })
export type AnnouncementValues = z.infer<typeof announcementSchema>

const userBase = {
  name: z.string().trim().min(2, 'Enter the full name').max(80),
  email: z.email('Enter a valid email address'),
  role: z.enum(ROLES, 'Choose a role'),
  idNumber: z.string().trim().max(20),
  department: z.string().trim().max(80),
  program: z.string().trim().max(80),
  isActive: z.boolean(),
}
export const userCreateSchema = z.object({ ...userBase, password: z.string().min(8, 'Use at least 8 characters') })
/** When editing, the password is optional: leave it blank to keep the current one. */
export const userEditSchema = z.object({ ...userBase, password: z.string().refine((v) => v === '' || v.length >= 8, 'Use at least 8 characters, or leave blank') })
export type UserValues = z.infer<typeof userCreateSchema>
