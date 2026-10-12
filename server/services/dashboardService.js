const User = require('../models/User');
const Schedule = require('../models/Schedule');
const Task = require('../models/Task');
const ServiceRequest = require('../models/ServiceRequest');
const Appointment = require('../models/Appointment');
const Reservation = require('../models/Reservation');
const Announcement = require('../models/Announcement');
const Event = require('../models/Event');
const taskService = require('./taskService');
const requestService = require('./requestService');
const eventService = require('./eventService');
const announcementService = require('./announcementService');
const { todayStr, dayName, nowMinutes, fromMinutes } = require('../utils/time');
const { countMap, isStaff } = require('../utils/helpers');
const { ROLES, APPOINTMENT_STATUSES, RESERVATION_STATUSES, FACILITY_TYPES, DEPARTMENTS } = require('../utils/constants');

/** Bookings that have not finished yet: later dates, or today with an end time still ahead. */
const notFinished = () => {
  const today = todayStr();
  return { $or: [{ date: { $gt: today } }, { date: today, endTime: { $gt: fromMinutes(nowMinutes()) } }] };
};

async function userDashboard(user) {
  const staff = isStaff(user);
  const own = { user: user._id };
  const requestScope = staff ? {} : own;
  const apptScope = user.role === 'admin' ? {} : user.role === 'faculty' ? { $or: [{ staff: user._id }, own] } : own;
  const today = todayStr();
  const now = new Date();

  const [todayClasses, taskStats, upcomingTasks, requestStats, appts, reservations, events, announcements, recentTasks, recentRequests, recentAppts, recentRes] = await Promise.all([
    Schedule.find({ ...own, day: dayName(today) }).sort({ startTime: 1 }).lean(),
    taskService.statistics(own),
    taskService.upcoming(own, 7),
    requestService.statistics(requestScope),
    Appointment.find({ $and: [apptScope, notFinished()], status: 'scheduled' }).sort({ date: 1, startTime: 1 }).limit(5).populate('staff', 'name department').populate('user', 'name').lean(),
    Reservation.find({ $and: [staff ? {} : own, notFinished()], status: 'confirmed' }).sort({ date: 1, startTime: 1 }).limit(5).populate('user', 'name').lean(),
    Event.find({ date: { $gte: today } }).sort({ date: 1, startTime: 1 }).limit(10).lean(),
    Announcement.find(announcementService.stateFilter('active', now)).sort({ publishDate: -1 }).limit(5).lean(),
    Task.find(own).sort({ updatedAt: -1 }).limit(4).lean(),
    ServiceRequest.find(requestScope).sort({ updatedAt: -1 }).limit(4).lean(),
    Appointment.find(apptScope).sort({ updatedAt: -1 }).limit(3).lean(),
    Reservation.find(staff ? {} : own).sort({ updatedAt: -1 }).limit(3).lean(),
  ]);

  const activity = [
    ...recentTasks.map((t) => ({ type: 'task', id: t._id, title: t.title, detail: t.status === 'completed' ? 'Task completed' : 'Task updated', at: t.updatedAt, link: '/tasks' })),
    ...recentRequests.map((r) => ({ type: 'request', id: r._id, title: r.title, detail: `Request ${r.status}`, at: r.updatedAt, link: `/service-requests/${r._id}` })),
    ...recentAppts.map((a) => ({ type: 'appointment', id: a._id, title: `${a.department} appointment`, detail: `${a.status} · ${a.date} ${a.startTime}`, at: a.updatedAt, link: '/appointments' })),
    ...recentRes.map((r) => ({ type: 'reservation', id: r._id, title: r.facility, detail: `${r.status} · ${r.date} ${r.startTime}`, at: r.updatedAt, link: '/reservations' })),
  ].sort((a, b) => new Date(b.at) - new Date(a.at)).slice(0, 8);

  return {
    generatedAt: now,
    today, dayName: dayName(today),
    todayClasses,
    tasks: { ...taskStats, upcoming: upcomingTasks.slice(0, 5) },
    serviceRequests: { total: requestStats.total, open: requestStats.open, byStatus: requestStats.byStatus, overdue: requestStats.overdue },
    upcomingAppointments: appts,
    upcomingReservations: reservations,
    upcomingEvents: events.map((e) => eventService.decorate(e, user)).filter((e) => e.state !== 'past').slice(0, 5),
    activeAnnouncements: announcements.map((a) => announcementService.decorate(a, now)),
    recentActivity: activity,
  };
}

const group = (Model, field, match = {}) => Model.aggregate([{ $match: match }, { $group: { _id: `$${field}`, count: { $sum: 1 } } }]);

/** Campus-wide analytics for staff/admin, aggregated from MongoDB on every call. */
async function analytics() {
  const now = new Date();
  const [usersByRole, activeUsers, taskStats, requestStats, apptByStatus, apptByDept, resByStatus, resByType, resByFacility, eventStats, annAll, schedules] = await Promise.all([
    group(User, 'role'),
    User.countDocuments({ isActive: true }),
    taskService.statistics({}),
    requestService.statistics({}),
    group(Appointment, 'status'),
    group(Appointment, 'department'),
    group(Reservation, 'status'),
    group(Reservation, 'facilityType', { status: { $ne: 'cancelled' } }),
    Reservation.aggregate([{ $match: { status: { $ne: 'cancelled' } } }, { $group: { _id: '$facility', count: { $sum: 1 } } }, { $sort: { count: -1, _id: 1 } }, { $limit: 5 }]),
    eventService.statistics(),
    Announcement.find().select('publishDate expiryDate').lean(),
    Schedule.countDocuments(),
  ]);
  const roles = countMap(usersByRole, ROLES);
  const annStates = { upcoming: 0, active: 0, expired: 0 };
  annAll.forEach((a) => { annStates[announcementService.stateOf(a, now)] += 1; });
  const appt = countMap(apptByStatus, APPOINTMENT_STATUSES);
  const res = countMap(resByStatus, RESERVATION_STATUSES);
  return {
    generatedAt: now,
    users: { total: Object.values(roles).reduce((a, b) => a + b, 0), active: activeUsers, byRole: roles },
    schedules: { total: schedules },
    tasks: taskStats,
    serviceRequests: requestStats,
    appointments: { total: Object.values(appt).reduce((a, b) => a + b, 0), byStatus: appt, byDepartment: countMap(apptByDept, DEPARTMENTS) },
    reservations: {
      total: Object.values(res).reduce((a, b) => a + b, 0), byStatus: res, byFacilityType: countMap(resByType, FACILITY_TYPES),
      topFacilities: resByFacility.map((r) => ({ facility: r._id, count: r.count })),
    },
    events: eventStats,
    announcements: { total: annAll.length, ...annStates },
  };
}

module.exports = { userDashboard, analytics, notFinished };
