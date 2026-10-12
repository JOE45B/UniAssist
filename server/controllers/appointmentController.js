const Appointment = require('../models/Appointment');
const User = require('../models/User');
const core = require('../services/bookingCore');
const ApiError = require('../utils/ApiError');
const { pick, isStaff, assertId } = require('../utils/helpers');
const { assertDateStr, isValidDateStr } = require('../utils/time');
const { APPOINTMENT_STATUSES, DEPARTMENTS, OFFICE_OPEN, OFFICE_CLOSE } = require('../utils/constants');
const { sharedScope, loadOr404, assertCanAccess } = require('./_access');

const HOURS = { open: OFFICE_OPEN, close: OFFICE_CLOSE, label: 'Appointments' };
const ACTIVE = ['scheduled'];
const FIELDS = ['department', 'staff', 'date', 'startTime', 'endTime', 'purpose'];
const resourceOf = (staffId) => `staff:${staffId}`;

/** The referenced staff member must exist, be active, and actually be staff. */
async function loadStaff(id) {
  const staff = await User.findById(assertId(id, 'staff member'));
  if (!staff || !staff.isActive) throw ApiError.badRequest('Selected staff member does not exist');
  if (!isStaff(staff)) throw ApiError.badRequest('Appointments can only be booked with faculty or staff');
  return staff;
}

const populate = (q) => q.populate('staff', 'name department email').populate('user', 'name email idNumber');

exports.list = async (req, res) => {
  const f = sharedScope(req);
  const { status, department, staff, date, from, to } = req.query;
  if (status) { if (!APPOINTMENT_STATUSES.includes(status)) throw ApiError.badRequest('Unknown status'); f.status = status; }
  if (department) { if (!DEPARTMENTS.includes(department)) throw ApiError.badRequest('Unknown department'); f.department = department; }
  if (staff) f.staff = assertId(staff, 'staff');
  if (date) { assertDateStr(date); f.date = date; }
  if (from || to) {
    f.date = {};
    if (from) { assertDateStr(from, 'from'); f.date.$gte = from; }
    if (to) { assertDateStr(to, 'to'); f.date.$lte = to; }
  }
  res.json(await populate(Appointment.find(f).sort({ date: req.query.order === 'desc' ? -1 : 1, startTime: 1 })).lean());
};

/** GET /api/appointments/availability?staff=<id>&date=YYYY-MM-DD[&startTime&endTime] */
exports.availability = async (req, res) => {
  const { staff: staffId, date, startTime, endTime } = req.query;
  if (!staffId || !date) throw ApiError.badRequest('staff and date query parameters are required');
  if (!isValidDateStr(date)) throw ApiError.badRequest('date must be YYYY-MM-DD');
  const staff = await loadStaff(staffId);
  const booked = (await core.findOverlaps(Appointment, { staff: staff._id }, ACTIVE, { date, startTime: '00:00', endTime: '23:59' }))
    .map((b) => ({ startTime: b.startTime, endTime: b.endTime }));
  const out = { staff: { _id: staff._id, name: staff.name, department: staff.department }, date, officeHours: { open: OFFICE_OPEN, close: OFFICE_CLOSE }, booked, freeSlots: core.freeSlots(booked, date, HOURS) };
  if (startTime && endTime) {
    require('../utils/time').assertTimeRange(startTime, endTime);
    out.requested = { startTime, endTime, available: !booked.some((b) => startTime < b.endTime && endTime > b.startTime) };
  }
  res.json(out);
};

exports.get = async (req, res) => {
  const doc = await populate(Appointment.findById(req.params.id));
  if (!doc) throw ApiError.notFound('Appointment not found');
  assertCanAccess(doc, req);
  res.json(doc);
};

exports.create = async (req, res) => {
  const data = pick(req.body, FIELDS);
  for (const k of FIELDS) if (!data[k]) throw ApiError.badRequest(`${k} is required`);
  const staff = await loadStaff(data.staff);
  if (String(staff._id) === String(req.user._id)) throw ApiError.badRequest('You cannot book an appointment with yourself');
  core.validateSlot(data, HOURS);
  const doc = await core.create({
    Model: Appointment, data: { ...data, staff: staff._id, user: req.user._id, status: 'scheduled' },
    resource: resourceOf(staff._id), resourceFilter: { staff: staff._id }, activeStatuses: ACTIVE, conflictLabel: staff.name,
  });
  res.status(201).json(await populate(Appointment.findById(doc._id)));
};

exports.update = async (req, res) => {
  const doc = await loadOr404(Appointment, req.params.id, 'Appointment');
  assertCanAccess(doc, req);
  if (doc.status !== 'scheduled') throw ApiError.badRequest(`A ${doc.status} appointment can no longer be changed`);
  const data = pick(req.body, FIELDS);
  const staff = await loadStaff(data.staff || doc.staff);
  Object.assign(doc, data, { staff: staff._id });
  core.validateSlot(doc, HOURS);
  await core.update({ doc, resource: resourceOf(staff._id), resourceFilter: { staff: staff._id }, activeStatuses: ACTIVE, conflictLabel: staff.name });
  res.json(await populate(Appointment.findById(doc._id)));
};

async function setStatus(req, res, status) {
  const doc = await loadOr404(Appointment, req.params.id, 'Appointment');
  assertCanAccess(doc, req);
  if (status === 'completed' && !isStaff(req.user)) throw ApiError.forbidden('Only staff can mark an appointment as completed');
  const updated = await Appointment.findOneAndUpdate({ _id: doc._id, status: 'scheduled' }, { $set: { status } }, { new: true });
  if (!updated) throw ApiError.badRequest(`Only a scheduled appointment can be ${status}; this one is ${doc.status}`);
  if (status === 'cancelled') await core.release(doc._id); // frees the slot for others
  res.json(await populate(Appointment.findById(doc._id)));
}
exports.cancel = (req, res) => setStatus(req, res, 'cancelled');
exports.complete = (req, res) => setStatus(req, res, 'completed');

exports.remove = async (req, res) => {
  const doc = await loadOr404(Appointment, req.params.id, 'Appointment');
  assertCanAccess(doc, req);
  await doc.deleteOne();
  await core.release(doc._id);
  res.json({ message: 'Appointment deleted', id: doc._id });
};
