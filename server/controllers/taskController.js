const Task = require('../models/Task');
const taskService = require('../services/taskService');
const ApiError = require('../utils/ApiError');
const { pick } = require('../utils/helpers');
const { personalScope, loadOr404, assertCanAccess } = require('./_access');

const FIELDS = ['title', 'description', 'subject', 'dueDate', 'priority', 'status'];

function applyStatus(doc, wasCompleted) {
  if (doc.status === 'completed' && !wasCompleted) doc.completedAt = new Date();
  if (doc.status !== 'completed') doc.completedAt = null;
}

exports.list = async (req, res) => res.json(await taskService.list(personalScope(req), req.query));

exports.upcoming = async (req, res) => {
  const days = req.query.days === undefined ? 7 : Number(req.query.days);
  if (!Number.isInteger(days) || days < 0 || days > 60) throw ApiError.badRequest('days must be a whole number between 0 and 60');
  res.json(await taskService.upcoming(personalScope(req), days));
};

exports.statistics = async (req, res) => res.json(await taskService.statistics(personalScope(req)));

exports.get = async (req, res) => {
  const doc = await loadOr404(Task, req.params.id, 'Task');
  assertCanAccess(doc, req, { staffAllowed: false });
  res.json(taskService.decorate(doc));
};

exports.create = async (req, res) => {
  const body = pick(req.body, FIELDS);
  if (body.status === 'overdue') throw ApiError.badRequest('"overdue" is calculated from the due date and cannot be set directly');
  const doc = new Task({ ...body, user: req.user._id });
  applyStatus(doc, false);
  await doc.save();
  res.status(201).json(taskService.decorate(doc));
};

exports.update = async (req, res) => {
  const doc = await loadOr404(Task, req.params.id, 'Task');
  assertCanAccess(doc, req, { staffAllowed: false });
  const body = pick(req.body, FIELDS);
  if (body.status === 'overdue') throw ApiError.badRequest('"overdue" is calculated from the due date and cannot be set directly');
  const wasCompleted = doc.status === 'completed';
  Object.assign(doc, body);
  applyStatus(doc, wasCompleted);
  await doc.save();
  res.json(taskService.decorate(doc));
};

exports.remove = async (req, res) => {
  const doc = await loadOr404(Task, req.params.id, 'Task');
  assertCanAccess(doc, req, { staffAllowed: false });
  await doc.deleteOne();
  res.json({ message: 'Task deleted', id: doc._id });
};
