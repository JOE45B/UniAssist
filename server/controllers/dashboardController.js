const Schedule = require('../models/Schedule');
const Task = require('../models/Task');
const ServiceRequest = require('../models/ServiceRequest');
const Announcement = require('../models/Announcement');
const Event = require('../models/Event');
const dashboardService = require('../services/dashboardService');
const taskService = require('../services/taskService');
const eventService = require('../services/eventService');
const announcementService = require('../services/announcementService');
const ApiError = require('../utils/ApiError');
const { rx, isStaff } = require('../utils/helpers');

exports.statistics = async (req, res) => res.json(await dashboardService.userDashboard(req.user));
exports.analytics = async (req, res) => res.json(await dashboardService.analytics());

const TYPES = ['tasks', 'schedules', 'requests', 'events', 'announcements'];

/** GET /api/search?q=...&types=tasks,events&limit=5 — multi-collection search scoped to what the user may see. */
exports.search = async (req, res) => {
  const q = String(req.query.q || '').trim();
  if (q.length < 2) throw ApiError.badRequest('Search text must be at least 2 characters');
  const types = req.query.types ? String(req.query.types).split(',').map((t) => t.trim()).filter(Boolean) : TYPES;
  const bad = types.find((t) => !TYPES.includes(t));
  if (bad) throw ApiError.badRequest(`Unknown search type "${bad}". Use: ${TYPES.join(', ')}`);
  const limit = Math.min(Math.max(Number(req.query.limit) || 5, 1), 20);
  const re = rx(q);
  const own = { user: req.user._id };
  const now = new Date();
  const run = {
    tasks: async () => (await Task.find({ ...own, $or: [{ title: re }, { subject: re }, { description: re }] }).sort({ dueDate: 1 }).limit(limit).lean()).map((t) => taskService.decorate(t, now)),
    schedules: () => Schedule.find({ ...own, $or: [{ courseCode: re }, { courseName: re }, { instructor: re }, { room: re }] }).limit(limit).lean(),
    requests: () => ServiceRequest.find({ ...(isStaff(req.user) ? {} : own), $or: [{ title: re }, { description: re }, { category: re }] }).sort({ submittedAt: -1 }).limit(limit).lean(),
    events: async () => (await Event.find({ $or: [{ title: re }, { description: re }, { location: re }] }).sort({ date: 1 }).limit(limit).lean()).map((e) => eventService.decorate(e, req.user)),
    announcements: async () => (await Announcement.find({ ...(isStaff(req.user) ? {} : announcementService.stateFilter('active', now)), $or: [{ title: re }, { content: re }] }).sort({ publishDate: -1 }).limit(limit).lean()).map((a) => announcementService.decorate(a, now)),
  };
  const results = {};
  await Promise.all(types.map(async (t) => { results[t] = await run[t](); }));
  res.json({ query: q, total: Object.values(results).reduce((n, r) => n + r.length, 0), results });
};

exports.meta = async (req, res) => {
  const c = require('../utils/constants');
  res.json({
    priorities: c.PRIORITIES, requestCategories: c.REQUEST_CATEGORIES, requestStatuses: c.REQUEST_STATUSES, requestTransitions: c.REQUEST_TRANSITIONS,
    departments: c.DEPARTMENTS, facilities: c.FACILITIES, facilityTypes: c.FACILITY_TYPES, announcementCategories: c.ANNOUNCEMENT_CATEGORIES,
    eventCategories: c.EVENT_CATEGORIES, officeHours: { open: c.OFFICE_OPEN, close: c.OFFICE_CLOSE }, facilityHours: { open: c.OPEN_HOUR, close: c.CLOSE_HOUR },
  });
};
