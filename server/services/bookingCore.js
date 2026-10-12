// Shared create / reschedule / cancel flow for anything that books a time slot on a
// shared resource (appointments -> staff member, reservations -> facility).
const mongoose = require('mongoose');
const locks = require('./lockService');
const ApiError = require('../utils/ApiError');
const { assertTimeRange, assertDateStr, assertNotPast, toMinutes, fromMinutes, todayStr, nowMinutes } = require('../utils/time');

function validateSlot({ date, startTime, endTime }, { open, close, label }) {
  assertDateStr(date);
  assertTimeRange(startTime, endTime, { grid: true });
  assertNotPast(date, startTime);
  if (toMinutes(startTime) < toMinutes(open) || toMinutes(endTime) > toMinutes(close)) {
    throw ApiError.badRequest(`${label} must be between ${open} and ${close}`);
  }
}

/** Correct interval overlap: newStart < existingEnd AND newEnd > existingStart. */
function findOverlaps(Model, resourceFilter, activeStatuses, { date, startTime, endTime }, excludeId) {
  const q = { ...resourceFilter, date, status: { $in: activeStatuses }, startTime: { $lt: endTime }, endTime: { $gt: startTime } };
  if (excludeId) q._id = { $ne: excludeId };
  return Model.find(q).sort({ startTime: 1 }).lean();
}

const describe = (rows) => rows.map((r) => `${r.startTime}-${r.endTime}`).join(', ');

async function create({ Model, data, resource, resourceFilter, activeStatuses, conflictLabel }) {
  const clash = await findOverlaps(Model, resourceFilter, activeStatuses, data);
  if (clash.length) throw ApiError.conflict(`${conflictLabel} is already booked at ${describe(clash)} on ${data.date}`);
  const _id = new mongoose.Types.ObjectId();
  try {
    await locks.acquire(resource, data.date, data.startTime, data.endTime, _id);
  } catch (err) {
    if (err instanceof locks.SlotConflictError) throw ApiError.conflict(`${conflictLabel} was just booked by someone else for that time. Please pick another slot.`);
    throw err;
  }
  try {
    return await Model.create({ ...data, _id });
  } catch (err) {
    await locks.release(_id);
    throw err;
  }
}

async function update({ doc, resource, resourceFilter, activeStatuses, conflictLabel }) {
  const clash = await findOverlaps(doc.constructor, resourceFilter, activeStatuses, doc, doc._id);
  if (clash.length) throw ApiError.conflict(`${conflictLabel} is already booked at ${describe(clash)} on ${doc.date}`);
  await doc.validate();
  let plan;
  try {
    plan = await locks.reschedule(resource, doc.date, doc.startTime, doc.endTime, doc._id);
  } catch (err) {
    if (err instanceof locks.SlotConflictError) throw ApiError.conflict(`${conflictLabel} was just booked by someone else for that time. Please pick another slot.`);
    throw err;
  }
  try {
    await doc.save();
  } catch (err) {
    await locks.removeByIds(plan.added);
    throw err;
  }
  await locks.removeByIds(plan.stale);
  return doc;
}

/** Free start times of `step` minutes between open and close, given booked intervals. */
function freeSlots(booked, date, { open, close, step = 30 }) {
  const out = [];
  const isToday = date === todayStr();
  for (let m = toMinutes(open); m + step <= toMinutes(close); m += step) {
    const s = fromMinutes(m); const e = fromMinutes(m + step);
    if (date < todayStr() || (isToday && m <= nowMinutes())) continue;
    if (!booked.some((b) => toMinutes(s) < toMinutes(b.endTime) && toMinutes(e) > toMinutes(b.startTime))) out.push({ startTime: s, endTime: e });
  }
  return out;
}

module.exports = { validateSlot, findOverlaps, create, update, freeSlots, release: locks.release };
