const User = require('../models/User');
const Schedule = require('../models/Schedule');
const Task = require('../models/Task');
const ServiceRequest = require('../models/ServiceRequest');
const Appointment = require('../models/Appointment');
const Reservation = require('../models/Reservation');
const Event = require('../models/Event');
const SlotLock = require('../models/SlotLock');
const ApiError = require('../utils/ApiError');
const { pick, rx, sortFrom } = require('../utils/helpers');
const { ROLES } = require('../utils/constants');
const { loadOr404 } = require('./_access');

const FIELDS = ['name', 'email', 'password', 'role', 'idNumber', 'department', 'program', 'yearLevel', 'isActive'];

exports.list = async (req, res) => {
  const f = {};
  if (req.query.role) { if (!ROLES.includes(req.query.role)) throw ApiError.badRequest('Unknown role'); f.role = req.query.role; }
  if (req.query.isActive) f.isActive = req.query.isActive === 'true';
  if (req.query.q) f.$or = [{ name: rx(req.query.q) }, { email: rx(req.query.q) }, { idNumber: rx(req.query.q) }, { department: rx(req.query.q) }];
  res.json(await User.find(f).sort(sortFrom(req.query, ['name', 'email', 'role', 'createdAt'], { role: 1, name: 1 })));
};

/** Staff directory for the appointment form (available to every signed-in user). */
exports.staff = async (req, res) => {
  const f = { role: { $in: ['faculty', 'admin'] }, isActive: true };
  if (req.query.department) f.department = req.query.department;
  res.json(await User.find(f).select('name department role email').sort({ name: 1 }));
};

exports.get = async (req, res) => res.json(await loadOr404(User, req.params.id, 'User'));

exports.create = async (req, res) => {
  const data = pick(req.body, FIELDS);
  if (!data.idNumber) delete data.idNumber;
  res.status(201).json(await User.create(data));
};

exports.update = async (req, res) => {
  const user = await loadOr404(User, req.params.id, 'User');
  const data = pick(req.body, FIELDS);
  if (!data.password) delete data.password;
  if (data.idNumber === '') data.idNumber = undefined;
  if (String(user._id) === String(req.user._id) && ((data.role && data.role !== 'admin') || data.isActive === false)) {
    throw ApiError.badRequest('You cannot demote or deactivate your own admin account');
  }
  Object.assign(user, data);
  await user.save();
  res.json(user);
};

/** Deleting a user removes everything that references them, so no orphaned references remain. */
exports.remove = async (req, res) => {
  const user = await loadOr404(User, req.params.id, 'User');
  if (String(user._id) === String(req.user._id)) throw ApiError.badRequest('You cannot delete your own account');
  const bookings = [
    ...(await Appointment.find({ $or: [{ user: user._id }, { staff: user._id }] }).select('_id').lean()),
    ...(await Reservation.find({ user: user._id }).select('_id').lean()),
  ].map((b) => b._id);
  await Promise.all([
    SlotLock.deleteMany({ booking: { $in: bookings } }),
    Schedule.deleteMany({ user: user._id }),
    Task.deleteMany({ user: user._id }),
    ServiceRequest.deleteMany({ user: user._id }),
    Appointment.deleteMany({ $or: [{ user: user._id }, { staff: user._id }] }),
    Reservation.deleteMany({ user: user._id }),
    Event.updateMany({ registrations: user._id }, { $pull: { registrations: user._id }, $inc: { registeredCount: -1 } }),
  ]);
  await user.deleteOne();
  res.json({ message: 'User and related records deleted', id: user._id });
};
