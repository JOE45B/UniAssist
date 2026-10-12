const ServiceRequest = require('../models/ServiceRequest');
const requestService = require('../services/requestService');
const taskService = require('../services/taskService');
const ApiError = require('../utils/ApiError');
const { pick, rx, isStaff, sortFrom } = require('../utils/helpers');
const { isValidDateStr, addDays } = require('../utils/time');
const { REQUEST_STATUSES, REQUEST_CATEGORIES, PRIORITIES } = require('../utils/constants');
const { sharedScope, loadOr404, assertCanAccess, isOwner } = require('./_access');

const oneOf = (value, list, label) => { if (!list.includes(value)) throw ApiError.badRequest(`Unknown ${label} "${value}"`); return value; };

exports.list = async (req, res) => {
  const f = sharedScope(req);
  const { status, category, priority, q, from, to } = req.query;
  if (status) f.status = oneOf(status, REQUEST_STATUSES, 'status');
  if (category) f.category = oneOf(category, REQUEST_CATEGORIES, 'category');
  if (priority) f.priority = oneOf(priority, PRIORITIES, 'priority');
  if (q) f.$or = [{ title: rx(q) }, { description: rx(q) }];
  if (from || to) {
    f.submittedAt = {};
    if (from) { if (!isValidDateStr(from)) throw ApiError.badRequest('from must be YYYY-MM-DD'); f.submittedAt.$gte = taskService.startOfDay(from); }
    if (to) { if (!isValidDateStr(to)) throw ApiError.badRequest('to must be YYYY-MM-DD'); f.submittedAt.$lt = taskService.startOfDay(addDays(to, 1)); }
  }
  const rows = await ServiceRequest.find(f).sort(sortFrom(req.query, ['submittedAt', 'dueDate', 'status', 'category', 'title'], { submittedAt: -1 }))
    .populate('user', 'name email idNumber').lean();
  res.json(rows.map((r) => requestService.decorate(r)));
};

exports.statistics = async (req, res) => res.json(await requestService.statistics(sharedScope(req)));

exports.get = async (req, res) => {
  const doc = await ServiceRequest.findById(req.params.id).populate('user', 'name email idNumber program').populate('history.changedBy', 'name role');
  if (!doc) throw ApiError.notFound('Service request not found');
  assertCanAccess(doc, req);
  res.json(requestService.decorate(doc));
};

exports.create = async (req, res) => {
  const body = pick(req.body, ['category', 'title', 'description', 'priority', 'dueDate']);
  if (!body.dueDate) delete body.dueDate;
  const now = new Date();
  const doc = await ServiceRequest.create({ ...body, user: req.user._id, status: 'pending', submittedAt: now, history: [{ status: 'pending', note: 'Request submitted', changedBy: req.user._id, at: now }] });
  res.status(201).json(requestService.decorate(doc));
};

/** Content edits. Status never changes here; it has its own endpoint with workflow validation. */
exports.update = async (req, res) => {
  const doc = await loadOr404(ServiceRequest, req.params.id, 'Service request');
  assertCanAccess(doc, req);
  if (req.body.status !== undefined && req.body.status !== doc.status) {
    throw ApiError.badRequest('Use PATCH /api/service-requests/:id/status to change the status');
  }
  let fields = ['priority', 'dueDate'];
  if (isOwner(doc, req.user)) {
    if (doc.status !== 'pending' && !isStaff(req.user)) throw ApiError.badRequest(`A ${doc.status} request can no longer be edited`);
    fields = ['category', 'title', 'description', 'priority', 'dueDate'];
  }
  const body = pick(req.body, fields);
  if (body.dueDate === '') body.dueDate = null;
  Object.assign(doc, body);
  await doc.save();
  res.json(requestService.decorate(doc));
};

exports.changeStatus = async (req, res) => {
  const doc = await requestService.changeStatus(req.user, req.params.id, req.body?.status, req.body?.note);
  res.json(requestService.decorate(doc));
};

exports.remove = async (req, res) => {
  const doc = await loadOr404(ServiceRequest, req.params.id, 'Service request');
  if (req.user.role !== 'admin') {
    if (!isOwner(doc, req.user)) throw ApiError.forbidden();
    if (!['pending', 'cancelled'].includes(doc.status)) throw ApiError.badRequest(`A ${doc.status} request cannot be deleted. Cancel it instead.`);
  }
  await doc.deleteOne();
  res.json({ message: 'Service request deleted', id: doc._id });
};
