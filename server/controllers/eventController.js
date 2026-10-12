const Event = require('../models/Event');
const svc = require('../services/eventService');
const ApiError = require('../utils/ApiError');
const { pick, rx } = require('../utils/helpers');
const { assertDateStr } = require('../utils/time');
const { EVENT_CATEGORIES } = require('../utils/constants');
const { loadOr404 } = require('./_access');

const FIELDS = ['title', 'description', 'location', 'date', 'startTime', 'endTime', 'category', 'capacity'];

exports.list = async (req, res) => {
  const f = {};
  const { category, q, from, to, state, availability } = req.query;
  if (category) { if (!EVENT_CATEGORIES.includes(category)) throw ApiError.badRequest('Unknown category'); f.category = category; }
  if (q) f.$or = [{ title: rx(q) }, { description: rx(q) }, { location: rx(q) }];
  if (from || to) {
    f.date = {};
    if (from) { assertDateStr(from, 'from'); f.date.$gte = from; }
    if (to) { assertDateStr(to, 'to'); f.date.$lte = to; }
  }
  if (state && !['upcoming', 'ongoing', 'past'].includes(state)) throw ApiError.badRequest('state must be upcoming, ongoing or past');
  let rows = (await Event.find(f).sort({ date: 1, startTime: 1 }).lean()).map((e) => svc.decorate(e, req.user));
  if (state) rows = rows.filter((e) => e.state === state);
  if (availability === 'open') rows = rows.filter((e) => !e.isFull);
  if (availability === 'full') rows = rows.filter((e) => e.isFull);
  if (req.query.mine === 'true') rows = rows.filter((e) => e.isRegistered);
  if (req.query.order === 'desc') rows.reverse();
  res.json(rows);
};

exports.statistics = async (req, res) => res.json(await svc.statistics());

exports.get = async (req, res) => res.json(svc.decorate(await loadOr404(Event, req.params.id, 'Event'), req.user));

/** GET /api/events/:id/availability -> capacity, registered count, remaining slots */
exports.availability = async (req, res) => {
  const e = svc.decorate(await loadOr404(Event, req.params.id, 'Event'), req.user);
  res.json({ eventId: e._id, title: e.title, capacity: e.capacity, registeredCount: e.registeredCount, remainingSlots: e.remainingSlots, isFull: e.isFull, state: e.state, canRegister: !e.isFull && e.state !== 'past' && !e.isRegistered, isRegistered: e.isRegistered });
};

exports.registrations = async (req, res) => {
  const e = await Event.findById(req.params.id).populate('registrations', 'name email idNumber program');
  if (!e) throw ApiError.notFound('Event not found');
  res.json({ eventId: e._id, title: e.title, capacity: e.capacity, registeredCount: e.registrations.length, attendees: e.registrations });
};

exports.create = async (req, res) => res.status(201).json(svc.decorate(await Event.create({ ...pick(req.body, FIELDS), createdBy: req.user._id, registrations: [], registeredCount: 0 }), req.user));
exports.update = async (req, res) => res.json(svc.decorate(await svc.update(req.params.id, pick(req.body, FIELDS)), req.user));
exports.register = async (req, res) => res.status(201).json(svc.decorate(await svc.register(req.params.id, req.user), req.user));
exports.unregister = async (req, res) => res.json(svc.decorate(await svc.unregister(req.params.id, req.user), req.user));

exports.remove = async (req, res) => {
  const doc = await loadOr404(Event, req.params.id, 'Event');
  await doc.deleteOne();
  res.json({ message: 'Event deleted', id: doc._id });
};
