// Constraint-based double-booking prevention (no multi-document transaction needed,
// so it works the same on Atlas, a replica set, or a standalone mongod).
// See models/SlotLock.js for the unique index that does the real work.
const mongoose = require('mongoose');
const SlotLock = require('../models/SlotLock');
const { toMinutes, SLOT_MINUTES } = require('../utils/time');

class SlotConflictError extends Error {}

function slotsFor(startTime, endTime) {
  const out = [];
  for (let m = toMinutes(startTime); m < toMinutes(endTime); m += SLOT_MINUTES) out.push(m);
  return out;
}

async function insertLocks(docs) {
  if (!docs.length) return [];
  const ids = docs.map((d) => d._id);
  try {
    await SlotLock.insertMany(docs, { ordered: true });
    return ids;
  } catch (err) {
    // Undo whatever part of this batch made it in, then report the conflict.
    await SlotLock.deleteMany({ _id: { $in: ids } });
    const dup = err.code === 11000 || (err.writeErrors || []).some((w) => (w.code || w.err?.code) === 11000);
    if (dup) throw new SlotConflictError('slot already taken');
    throw err;
  }
}

const build = (resource, date, slot, booking) => ({ _id: new mongoose.Types.ObjectId(), resource, date, slot, booking });

/** Claims every slot of a new booking, or throws SlotConflictError and leaves nothing behind. */
async function acquire(resource, date, startTime, endTime, bookingId) {
  return insertLocks(slotsFor(startTime, endTime).map((s) => build(resource, date, s, bookingId)));
}

/**
 * Moves an existing booking to a new resource/date/time. Slots the booking already
 * holds are kept (so a booking never conflicts with itself); only the new ones are
 * claimed. Returns { added, stale } so the caller can roll back or finish.
 */
async function reschedule(resource, date, startTime, endTime, bookingId) {
  const held = await SlotLock.find({ booking: bookingId }).lean();
  const key = (l) => `${l.resource}|${l.date}|${l.slot}`;
  const heldKeys = new Set(held.map(key));
  const wanted = slotsFor(startTime, endTime).map((s) => build(resource, date, s, bookingId));
  const wantedKeys = new Set(wanted.map(key));
  const added = await insertLocks(wanted.filter((w) => !heldKeys.has(key(w))));
  const stale = held.filter((h) => !wantedKeys.has(key(h))).map((h) => h._id);
  return { added, stale };
}

const removeByIds = (ids) => (ids.length ? SlotLock.deleteMany({ _id: { $in: ids } }) : null);
const release = (bookingId) => SlotLock.deleteMany({ booking: bookingId });

module.exports = { SlotConflictError, slotsFor, acquire, reschedule, removeByIds, release };
