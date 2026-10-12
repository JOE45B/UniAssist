const User = require('../models/User');
const ApiError = require('../utils/ApiError');
const { signToken } = require('../middleware/auth');
const { pick } = require('../utils/helpers');

exports.register = async (req, res) => {
  const data = pick(req.body, ['name', 'email', 'password', 'idNumber', 'program', 'yearLevel', 'department']);
  if (!data.idNumber) delete data.idNumber;
  const user = await User.create({ ...data, role: 'student' }); // self-registration is always a student
  res.status(201).json({ token: signToken(user), user });
};

exports.login = async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) throw ApiError.badRequest('Email and password are required');
  const user = await User.findOne({ email: String(email).toLowerCase().trim() }).select('+password');
  if (!user || !(await user.comparePassword(String(password)))) throw ApiError.unauthorized('Incorrect email or password');
  if (!user.isActive) throw ApiError.forbidden('This account has been deactivated');
  res.json({ token: signToken(user), user });
};

exports.me = async (req, res) => res.json(req.user);

exports.updateMe = async (req, res) => {
  Object.assign(req.user, pick(req.body, ['name', 'department', 'program', 'yearLevel']));
  if (req.body.password) req.user.password = req.body.password;
  await req.user.save();
  res.json(req.user);
};
