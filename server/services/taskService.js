const Task = require('../models/Task');
const ApiError = require('../utils/ApiError');
const { dateStrOf, todayStr, diffDays, addDays } = require('../utils/time');
const { rx, countMap } = require('../utils/helpers');
const { PRIORITIES } = require('../utils/constants');

const SOON_DAYS = 3;
const RANK = { high: 0, medium: 1, low: 2 };

/**
 * Pure deadline logic. A completed task is never overdue. A pending task is
 * overdue as soon as its due date/time has passed.
 */
function deadlineInfo(task, now = new Date()) {
  if (task.status === 'completed') return { effectiveStatus: 'completed', deadlineLabel: 'Completed', daysLeft: null };
  const due = new Date(task.dueDate);
  const daysLeft = diffDays(dateStrOf(now), dateStrOf(due));
  if (due < now) return { effectiveStatus: 'overdue', deadlineLabel: 'Overdue', daysLeft };
  let deadlineLabel = 'Upcoming';
  if (daysLeft === 0) deadlineLabel = 'Due today';
  else if (daysLeft === 1) deadlineLabel = 'Due tomorrow';
  else if (daysLeft <= SOON_DAYS) deadlineLabel = 'Due soon';
  return { effectiveStatus: 'pending', deadlineLabel, daysLeft };
}

const decorate = (task, now = new Date()) => ({ ...(task.toObject ? task.toObject() : task), ...deadlineInfo(task, now) });

/** End of the given calendar day in the app timezone, as a Date (exclusive upper bound). */
function startOfDay(dateStr) {
  // Find the UTC instant whose app-timezone calendar date flips to dateStr.
  let lo = new Date(`${dateStr}T00:00:00Z`).getTime() - 14 * 3600000;
  let hi = lo + 28 * 3600000;
  while (hi - lo > 1000) {
    const mid = Math.floor((lo + hi) / 2);
    if (dateStrOf(new Date(mid)) < dateStr) lo = mid; else hi = mid;
  }
  return new Date(hi - (hi % 1000));
}

function buildFilter(scope, query, now = new Date()) {
  const f = { ...scope };
  if (query.status === 'completed') f.status = 'completed';
  else if (query.status === 'pending') { f.status = 'pending'; f.dueDate = { $gte: now }; }
  else if (query.status === 'overdue') { f.status = 'pending'; f.dueDate = { $lt: now }; }
  else if (query.status) throw ApiError.badRequest('status must be pending, completed or overdue');
  if (query.priority) {
    if (!PRIORITIES.includes(query.priority)) throw ApiError.badRequest('priority must be low, medium or high');
    f.priority = query.priority;
  }
  if (query.subject) f.subject = rx(query.subject);
  if (query.q) f.$or = [{ title: rx(query.q) }, { description: rx(query.q) }, { subject: rx(query.q) }];
  return f;
}

async function list(scope, query) {
  const now = new Date();
  const tasks = (await Task.find(buildFilter(scope, query, now)).sort({ dueDate: 1, _id: 1 }).lean()).map((t) => decorate(t, now));
  const dir = query.order === 'desc' ? -1 : 1;
  const by = {
    priority: (a, b) => RANK[a.priority] - RANK[b.priority] || new Date(a.dueDate) - new Date(b.dueDate),
    title: (a, b) => a.title.localeCompare(b.title),
    createdAt: (a, b) => new Date(a.createdAt) - new Date(b.createdAt),
    dueDate: (a, b) => new Date(a.dueDate) - new Date(b.dueDate),
  }[query.sort];
  if (by) tasks.sort((a, b) => dir * by(a, b));
  return tasks;
}

async function upcoming(scope, days = 7) {
  const now = new Date();
  const until = startOfDay(addDays(todayStr(), Number(days) + 1));
  const tasks = await Task.find({ ...scope, status: 'pending', dueDate: { $gte: now, $lt: until } }).sort({ dueDate: 1 }).lean();
  return tasks.map((t) => decorate(t, now));
}

async function statistics(scope) {
  const now = new Date();
  const today = todayStr();
  const tomorrowStart = startOfDay(addDays(today, 1));
  const soonEnd = startOfDay(addDays(today, SOON_DAYS + 1));
  const open = { ...scope, status: 'pending' };
  const [total, completed, overdue, dueToday, dueSoon, byPriorityRows, bySubjectRows] = await Promise.all([
    Task.countDocuments(scope),
    Task.countDocuments({ ...scope, status: 'completed' }),
    Task.countDocuments({ ...open, dueDate: { $lt: now } }),
    Task.countDocuments({ ...open, dueDate: { $gte: now, $lt: tomorrowStart } }),
    Task.countDocuments({ ...open, dueDate: { $gte: now, $lt: soonEnd } }),
    Task.aggregate([{ $match: open }, { $group: { _id: '$priority', count: { $sum: 1 } } }]),
    Task.aggregate([{ $match: scope }, { $group: { _id: '$subject', count: { $sum: 1 } } }, { $sort: { count: -1, _id: 1 } }]),
  ]);
  return {
    total, completed, overdue,
    pending: total - completed - overdue,
    dueToday, dueSoon,
    completionRate: total ? Math.round((completed / total) * 100) : 0,
    openByPriority: countMap(byPriorityRows, PRIORITIES),
    bySubject: bySubjectRows.map((r) => ({ subject: r._id, count: r.count })),
  };
}

module.exports = { deadlineInfo, decorate, list, upcoming, statistics, startOfDay, SOON_DAYS };
