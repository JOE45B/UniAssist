const Reservation = require('../models/Reservation');
const core = require('../services/bookingCore');
const ApiError = require('../utils/ApiError');
const { pick, isStaff } = require('../utils/helpers');
const { assertDateStr, isValidDateStr, assertTimeRange } = require('../utils/time');
const { RESERVATION_STATUSES, FACILITIES, FACILITY_TYPES, OPEN_HOUR, CLOSE_HOUR } = require('../utils/constants');
const { sharedScope, loadOr404, assertCanAccess } = require('./_access');

const HOURS = { open: OPEN_HOUR, close: CLOSE_HOUR, label: 'Reservations' };
const ACTIVE = ['confirmed'];
const FIELDS = ['facility', 'date', 'startTime', 'endTime', 'purpose'];
const resourceOf = (name) => `facility:${name}`;

function facilityOf(name) {
  const f = FACILITIES.find((x) => x.name === name);
  if (!f) throw ApiError.badRequest(`Unknown facility "${name}"`);
  return f;
}
const populate = (q) => q.populate('user', 'name email idNumber');

exports.facilities = async (req, res) => res.json(FACILITIES);

exports.list = async (req, res) => {
  const f = sharedScope(req);
  const { status, facility, facilityType, date, from, to } = req.query;
  if (status) { if (!RESERVATION_STATUSES.includes(status)) throw ApiError.badRequest('Unknown status'); f.status = status; }
  if (facility) f.facility = facilityOf(facility).name;
  if (facilityType) { if (!FACILITY_TYPES.includes(facilityType)) throw ApiError.badRequest('Unknown facility type'); f.facilityType = facilityType; }
  if (date) { assertDateStr(date); f.date = date; }
  if (from || to) {
    f.date = {};
    if (from) { assertDateStr(from, 'from'); f.date.$gte = from; }
    if (to) { assertDateStr(to, 'to'); f.date.$lte = to; }
  }
  res.json(await populate(Reservation.find(f).sort({ date: req.query.order === 'desc' ? -1 : 1, startTime: 1 })).lean());
};

/**
 * GET /api/reservations/availability?date=YYYY-MM-DD[&facility][&facilityType][&startTime&endTime]
 * Returns each matching facility with its booked intervals, free 30-minute slots, and,
 * when a time range is supplied, whether that exact range is available.
 */
exports.availability = async (req, res) => {
  const { date, facility, facilityType, startTime, endTime } = req.query;
  if (!date || !isValidDateStr(date)) throw ApiError.badRequest('date query parameter is required (YYYY-MM-DD)');
  if (startTime || endTime) assertTimeRange(startTime, endTime);
  let list = FACILITIES;
  if (facility) list = [facilityOf(facility)];
  else if (facilityType) { if (!FACILITY_TYPES.includes(facilityType)) throw ApiError.badRequest('Unknown facility type'); list = FACILITIES.filter((x) => x.type === facilityType); }
  const rows = await Reservation.find({ date, status: { $in: ACTIVE }, facility: { $in: list.map((x) => x.name) } }).sort({ startTime: 1 }).lean();
  res.json({
    date, hours: { open: OPEN_HOUR, close: CLOSE_HOUR },
    facilities: list.map((fac) => {
      const booked = rows.filter((r) => r.facility === fac.name).map((r) => ({ startTime: r.startTime, endTime: r.endTime }));
      const out = { ...fac, booked, freeSlots: core.freeSlots(booked, date, HOURS) };
      if (startTime && endTime) out.available = !booked.some((b) => startTime < b.endTime && endTime > b.startTime);
      return out;
    }),
  });
};

exports.get = async (req, res) => {
  const doc = await populate(Reservation.findById(req.params.id));
  if (!doc) throw ApiError.notFound('Reservation not found');
  assertCanAccess(doc, req);
  res.json(doc);
};

exports.create = async (req, res) => {
  const data = pick(req.body, FIELDS);
  for (const k of FIELDS) if (!data[k]) throw ApiError.badRequest(`${k} is required`);
  const fac = facilityOf(data.facility);
  core.validateSlot(data, HOURS);
  const doc = await core.create({
    Model: Reservation, data: { ...data, facilityType: fac.type, user: req.user._id, status: 'confirmed' },
    resource: resourceOf(fac.name), resourceFilter: { facility: fac.name }, activeStatuses: ACTIVE, conflictLabel: fac.name,
  });
  res.status(201).json(await populate(Reservation.findById(doc._id)));
};

exports.update = async (req, res) => {
  const doc = await loadOr404(Reservation, req.params.id, 'Reservation');
  assertCanAccess(doc, req);
  if (doc.status !== 'confirmed') throw ApiError.badRequest(`A ${doc.status} reservation can no longer be changed`);
  Object.assign(doc, pick(req.body, FIELDS));
  const fac = facilityOf(doc.facility);
  doc.facilityType = fac.type;
  core.validateSlot(doc, HOURS);
  await core.update({ doc, resource: resourceOf(fac.name), resourceFilter: { facility: fac.name }, activeStatuses: ACTIVE, conflictLabel: fac.name });
  res.json(await populate(Reservation.findById(doc._id)));
};

async function setStatus(req, res, status) {
  const doc = await loadOr404(Reservation, req.params.id, 'Reservation');
  assertCanAccess(doc, req);
  if (status === 'completed' && !isStaff(req.user)) throw ApiError.forbidden('Only staff can mark a reservation as completed');
  const updated = await Reservation.findOneAndUpdate({ _id: doc._id, status: 'confirmed' }, { $set: { status } }, { new: true });
  if (!updated) throw ApiError.badRequest(`Only a confirmed reservation can be ${status}; this one is ${doc.status}`);
  if (status === 'cancelled') await core.release(doc._id);
  res.json(await populate(Reservation.findById(doc._id)));
}
exports.cancel = (req, res) => setStatus(req, res, 'cancelled');
exports.complete = (req, res) => setStatus(req, res, 'completed');

exports.remove = async (req, res) => {
  const doc = await loadOr404(Reservation, req.params.id, 'Reservation');
  assertCanAccess(doc, req);
  await doc.deleteOne();
  await core.release(doc._id);
  res.json({ message: 'Reservation deleted', id: doc._id });
};
