const Event = require('../models/Event');
const ApiError = require('../utils/ApiError');
const { todayStr, nowMinutes, toMinutes } = require('../utils/time');
const { countMap, isStaff } = require('../utils/helpers');
const { EVENT_CATEGORIES } = require('../utils/constants');

function stateOf(e) {
  const today = todayStr();
  if (e.date < today) return 'past';
  if (e.date > today) return 'upcoming';
  const now = nowMinutes();
  if (now >= toMinutes(e.endTime)) return 'past';
  return now >= toMinutes(e.startTime) ? 'ongoing' : 'upcoming';
}

/** Remaining slots are always capacity minus the actual number of registrations. */
function decorate(event, viewer) {
  const o = event.toObject ? event.toObject() : event;
  const regs = o.registrations || [];
  const registeredCount = regs.length;
  const out = {
    ...o,
    registeredCount,
    remainingSlots: Math.max(o.capacity - registeredCount, 0),
    isFull: registeredCount >= o.capacity,
    fillRate: Math.round((registeredCount / o.capacity) * 100),
    state: stateOf(o),
    isRegistered: viewer ? regs.some((r) => String(r._id || r) === String(viewer._id)) : false,
  };
  out.registeredCount = registeredCount; // always the real array length
  if (!viewer || !isStaff(viewer)) delete out.registrations; // attendee list is staff-only
  return out;
}

/**
 * Atomic registration. One findOneAndUpdate both checks and writes:
 *  - `registrations: { $ne: userId }`      -> no duplicate registration
 *  - `registeredCount: { $lt: capacity }`  -> there is still room
 *  - `capacity: <value we read>`           -> capacity was not edited in between
 * and the $push + $inc happen in that same single-document operation, so
 * concurrent requests cannot push the event over capacity.
 */
async function registerOnce(eventId, user) {
  const event = await Event.findById(eventId).lean();
  if (!event) throw ApiError.notFound('Event not found');
  if (stateOf(event) === 'past') throw ApiError.badRequest('Registration is closed: this event has already ended');
  const updated = await Event.findOneAndUpdate(
    { _id: eventId, capacity: event.capacity, registrations: { $ne: user._id }, registeredCount: { $lt: event.capacity } },
    { $push: { registrations: user._id }, $inc: { registeredCount: 1 } },
    { new: true },
  );
  if (updated) return updated;
  const fresh = await Event.findById(eventId).lean();
  if (!fresh) throw ApiError.notFound('Event not found');
  if (fresh.registrations.some((r) => String(r) === String(user._id))) throw ApiError.conflict('You are already registered for this event');
  if (fresh.registrations.length >= fresh.capacity) throw ApiError.conflict('Registration failed: this event is full');
  throw ApiError.conflict('The event changed while you were registering. Please try again.');
}

/**
 * Second layer: registrations for the same event are queued inside this Node process,
 * so the capacity check is also safe on MongoDB-compatible servers whose
 * findAndModify is not isolated. With several API instances, the atomic filter in
 * registerOnce() is the guard that matters.
 */
const queues = new Map();
function register(eventId, user) {
  const key = String(eventId);
  const run = (queues.get(key) || Promise.resolve()).catch(() => {}).then(() => registerOnce(eventId, user));
  const tail = run.catch(() => {}).finally(() => { if (queues.get(key) === tail) queues.delete(key); });
  queues.set(key, tail);
  return run;
}

async function unregister(eventId, user) {
  const updated = await Event.findOneAndUpdate({ _id: eventId, registrations: user._id }, { $pull: { registrations: user._id }, $inc: { registeredCount: -1 } }, { new: true });
  if (updated) return updated;
  if (!(await Event.exists({ _id: eventId }))) throw ApiError.notFound('Event not found');
  throw ApiError.badRequest('You are not registered for this event');
}

/** Capacity may never be lowered below the number of people already registered (checked atomically). */
async function update(eventId, changes) {
  const event = await Event.findById(eventId);
  if (!event) throw ApiError.notFound('Event not found');
  Object.assign(event, changes);
  await event.validate();
  const filter = { _id: eventId };
  if (changes.capacity !== undefined) filter.registeredCount = { $lte: event.capacity };
  const updated = await Event.findOneAndUpdate(filter, { $set: changes }, { new: true, runValidators: true });
  if (!updated) throw ApiError.badRequest(`Capacity cannot be lower than the ${event.registrations.length} people already registered`);
  return updated;
}

async function statistics() {
  const events = await Event.find().select('title date startTime endTime category capacity registrations').lean();
  const byCategory = await Event.aggregate([{ $group: { _id: '$category', count: { $sum: 1 } } }]);
  const rows = events.map((e) => decorate(e));
  const totalCapacity = rows.reduce((n, e) => n + e.capacity, 0);
  const totalRegistrations = rows.reduce((n, e) => n + e.registeredCount, 0);
  return {
    total: rows.length,
    upcoming: rows.filter((e) => e.state !== 'past').length,
    past: rows.filter((e) => e.state === 'past').length,
    full: rows.filter((e) => e.isFull).length,
    totalCapacity, totalRegistrations,
    remainingSlots: totalCapacity - totalRegistrations,
    averageFillRate: totalCapacity ? Math.round((totalRegistrations / totalCapacity) * 100) : 0,
    byCategory: countMap(byCategory, EVENT_CATEGORIES),
    mostPopular: [...rows].sort((a, b) => b.fillRate - a.fillRate).slice(0, 5)
      .map((e) => ({ _id: e._id, title: e.title, date: e.date, capacity: e.capacity, registeredCount: e.registeredCount, fillRate: e.fillRate })),
  };
}

module.exports = { stateOf, decorate, register, unregister, update, statistics };
