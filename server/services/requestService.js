const ServiceRequest = require('../models/ServiceRequest');
const ApiError = require('../utils/ApiError');
const { REQUEST_TRANSITIONS, REQUEST_STATUSES, REQUEST_CATEGORIES, PRIORITIES } = require('../utils/constants');
const { countMap, isStaff } = require('../utils/helpers');

const OPEN = ['pending', 'processing', 'ready'];
const canTransition = (from, to) => (REQUEST_TRANSITIONS[from] || []).includes(to);

function decorate(r, now = new Date()) {
  const o = r.toObject ? r.toObject() : r;
  return { ...o, allowedTransitions: REQUEST_TRANSITIONS[o.status] || [], isOverdue: Boolean(o.dueDate && OPEN.includes(o.status) && new Date(o.dueDate) < now) };
}

/**
 * Server-side workflow validation. Students may only cancel their own request;
 * staff may make any legal move. The update is conditional on the status we read,
 * so two simultaneous status changes cannot both succeed.
 */
async function changeStatus(actor, id, nextStatus, note = '') {
  if (!REQUEST_STATUSES.includes(nextStatus)) throw ApiError.badRequest(`Unknown status "${nextStatus}"`);
  const current = await ServiceRequest.findById(id);
  if (!current) throw ApiError.notFound('Service request not found');
  const owner = String(current.user) === String(actor._id);
  if (!isStaff(actor)) {
    if (!owner) throw ApiError.forbidden();
    if (nextStatus !== 'cancelled') throw ApiError.forbidden('Students can only cancel their own requests');
  }
  if (!canTransition(current.status, nextStatus)) {
    const allowed = REQUEST_TRANSITIONS[current.status];
    throw ApiError.badRequest(`Invalid status transition: ${current.status} -> ${nextStatus}. ${allowed.length ? `Allowed: ${allowed.join(', ')}` : `A ${current.status} request is final`}.`);
  }
  const now = new Date();
  const set = { status: nextStatus };
  if (nextStatus === 'completed') set.completedAt = now;
  const updated = await ServiceRequest.findOneAndUpdate(
    { _id: id, status: current.status },
    { $set: set, $push: { history: { status: nextStatus, note: String(note || '').slice(0, 300), changedBy: actor._id, at: now } } },
    { new: true },
  );
  if (!updated) throw ApiError.conflict('This request was updated by someone else. Reload and try again.');
  return updated;
}

async function statistics(scope) {
  const now = new Date();
  const [byStatus, byCategory, byPriority, overdue, done] = await Promise.all([
    ServiceRequest.aggregate([{ $match: scope }, { $group: { _id: '$status', count: { $sum: 1 } } }]),
    ServiceRequest.aggregate([{ $match: scope }, { $group: { _id: '$category', count: { $sum: 1 } } }]),
    ServiceRequest.aggregate([{ $match: { ...scope, status: { $in: OPEN } } }, { $group: { _id: '$priority', count: { $sum: 1 } } }]),
    ServiceRequest.countDocuments({ ...scope, status: { $in: OPEN }, dueDate: { $ne: null, $lt: now } }),
    ServiceRequest.find({ ...scope, status: 'completed', completedAt: { $ne: null } }).select('submittedAt completedAt').lean(),
  ]);
  const statusMap = countMap(byStatus, REQUEST_STATUSES);
  const total = Object.values(statusMap).reduce((a, b) => a + b, 0);
  const hours = done.map((d) => (new Date(d.completedAt) - new Date(d.submittedAt)) / 3600000).filter((h) => h >= 0);
  return {
    total,
    open: OPEN.reduce((n, s) => n + statusMap[s], 0),
    byStatus: statusMap,
    byCategory: countMap(byCategory, REQUEST_CATEGORIES),
    openByPriority: countMap(byPriority, PRIORITIES),
    overdue,
    resolutionRate: total ? Math.round((statusMap.completed / total) * 100) : 0,
    averageResolutionHours: hours.length ? Math.round((hours.reduce((a, b) => a + b, 0) / hours.length) * 10) / 10 : null,
  };
}

module.exports = { OPEN, canTransition, decorate, changeStatus, statistics };
