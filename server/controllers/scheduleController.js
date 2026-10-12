const Schedule = require('../models/Schedule');
const scheduleService = require('../services/scheduleService');
const ApiError = require('../utils/ApiError');
const { pick, rx, isId } = require('../utils/helpers');
const { DAYS } = require('../utils/time');
const { personalScope, loadOr404, assertCanAccess } = require('./_access');

const FIELDS = ['courseCode', 'courseName', 'instructor', 'room', 'day', 'startTime', 'endTime'];
const dayOrder = (a, b) => DAYS.indexOf(a.day) - DAYS.indexOf(b.day) || a.startTime.localeCompare(b.startTime);

exports.list = async (req, res) => {
  const f = personalScope(req);
  if (req.query.day) { if (!DAYS.includes(req.query.day)) throw ApiError.badRequest('Unknown day'); f.day = req.query.day; }
  if (req.query.q) f.$or = ['courseCode', 'courseName', 'instructor', 'room'].map((k) => ({ [k]: rx(req.query.q) }));
  res.json((await Schedule.find(f).lean()).sort(dayOrder));
};

/**
 * GET /api/schedules/conflicts
 *  - with ?day&startTime&endTime[&excludeId]: would this class overlap an existing one?
 *  - without parameters: every overlapping pair in the timetable.
 */
exports.conflicts = async (req, res) => {
  const { user } = personalScope(req);
  const { day, startTime, endTime, excludeId } = req.query;
  if (day || startTime || endTime) {
    if (!DAYS.includes(day)) throw ApiError.badRequest('Day must be a day of the week');
    require('../utils/time').assertTimeRange(startTime, endTime);
    if (excludeId && !isId(excludeId)) throw ApiError.badRequest('Invalid excludeId');
    const conflicts = await scheduleService.findConflicts(user, { day, startTime, endTime }, excludeId);
    return res.json({ hasConflict: conflicts.length > 0, conflicts });
  }
  const pairs = await scheduleService.allConflictPairs(user);
  res.json({ hasConflict: pairs.length > 0, conflicts: pairs });
};

exports.get = async (req, res) => {
  const doc = await loadOr404(Schedule, req.params.id, 'Schedule');
  assertCanAccess(doc, req, { staffAllowed: false });
  res.json(doc);
};

exports.create = async (req, res) => {
  const doc = new Schedule({ ...pick(req.body, FIELDS), user: req.user._id });
  await doc.validate();
  await scheduleService.assertNoConflict(req.user._id, doc);
  await doc.save();
  res.status(201).json(doc);
};

exports.update = async (req, res) => {
  const doc = await loadOr404(Schedule, req.params.id, 'Schedule');
  assertCanAccess(doc, req, { staffAllowed: false });
  Object.assign(doc, pick(req.body, FIELDS));
  await doc.validate();
  await scheduleService.assertNoConflict(doc.user, doc, doc._id); // exclude the record being edited
  await doc.save();
  res.json(doc);
};

exports.remove = async (req, res) => {
  const doc = await loadOr404(Schedule, req.params.id, 'Schedule');
  assertCanAccess(doc, req, { staffAllowed: false });
  await doc.deleteOne();
  res.json({ message: 'Schedule deleted', id: doc._id });
};
