const ROLES = ['student', 'faculty', 'admin'];
const PRIORITIES = ['low', 'medium', 'high'];
const TASK_STATUSES = ['pending', 'completed']; // "overdue" is computed, never stored
const REQUEST_CATEGORIES = ['Registrar', 'Enrollment', 'IT Support', 'Student Affairs', 'ID Concern', 'Document Request', 'Technical Support', 'Other'];
const REQUEST_STATUSES = ['pending', 'processing', 'ready', 'completed', 'rejected', 'cancelled'];
// Legal service-request workflow. Terminal states have no outgoing transitions.
const REQUEST_TRANSITIONS = {
  pending: ['processing', 'rejected', 'cancelled'],
  processing: ['ready', 'completed', 'rejected', 'cancelled'],
  ready: ['completed', 'cancelled'],
  completed: [],
  rejected: [],
  cancelled: [],
};
const DEPARTMENTS = ['Registrar', 'Guidance', 'Academic Advising', 'IT Services', 'Student Affairs', 'Finance', 'Library'];
const APPOINTMENT_STATUSES = ['scheduled', 'completed', 'cancelled'];
const RESERVATION_STATUSES = ['confirmed', 'completed', 'cancelled'];
const FACILITY_TYPES = ['Study Room', 'Computer Lab', 'Meeting Room', 'Library Room', 'Sports Facility'];
const FACILITIES = [
  { name: 'Study Room A', type: 'Study Room', capacity: 6 },
  { name: 'Study Room B', type: 'Study Room', capacity: 6 },
  { name: 'Study Room C', type: 'Study Room', capacity: 8 },
  { name: 'Computer Lab 1', type: 'Computer Lab', capacity: 40 },
  { name: 'Computer Lab 2', type: 'Computer Lab', capacity: 40 },
  { name: 'Meeting Room 301', type: 'Meeting Room', capacity: 12 },
  { name: 'Meeting Room 302', type: 'Meeting Room', capacity: 16 },
  { name: 'Library Discussion Room 1', type: 'Library Room', capacity: 8 },
  { name: 'Library Discussion Room 2', type: 'Library Room', capacity: 8 },
  { name: 'Covered Court', type: 'Sports Facility', capacity: 100 },
  { name: 'Fitness Gym', type: 'Sports Facility', capacity: 30 },
];
const ANNOUNCEMENT_CATEGORIES = ['Academic', 'Administrative', 'Events', 'Facilities', 'Emergency', 'General'];
const EVENT_CATEGORIES = ['Academic', 'Seminar', 'Sports', 'Cultural', 'Career', 'Organization', 'Other'];
const OPEN_HOUR = '07:00';
const CLOSE_HOUR = '21:00';
const OFFICE_OPEN = '08:00';
const OFFICE_CLOSE = '17:00';

module.exports = {
  ROLES, PRIORITIES, TASK_STATUSES, REQUEST_CATEGORIES, REQUEST_STATUSES, REQUEST_TRANSITIONS, DEPARTMENTS,
  APPOINTMENT_STATUSES, RESERVATION_STATUSES, FACILITY_TYPES, FACILITIES, ANNOUNCEMENT_CATEGORIES, EVENT_CATEGORIES,
  OPEN_HOUR, CLOSE_HOUR, OFFICE_OPEN, OFFICE_CLOSE,
};
