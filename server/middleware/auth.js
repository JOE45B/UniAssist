const jwt = require('jsonwebtoken');
const User = require('../models/User');
const ApiError = require('../utils/ApiError');

const secret = () => {
  if (!process.env.JWT_SECRET) throw new Error('JWT_SECRET is not set');
  return process.env.JWT_SECRET;
};
const signToken = (user) => jwt.sign({ sub: String(user._id), role: user.role }, secret(), { expiresIn: process.env.JWT_EXPIRES_IN || '7d' });

async function resolveUser(req) {
  const header = req.headers.authorization || '';
  if (!header.startsWith('Bearer ')) return null;
  let payload;
  try { payload = jwt.verify(header.slice(7), secret()); } catch { throw ApiError.unauthorized('Session expired or invalid. Please sign in again.'); }
  const user = await User.findById(payload.sub);
  if (!user || !user.isActive) throw ApiError.unauthorized('Account not found or deactivated');
  return user;
}

/** Requires a valid token. The role is always re-read from the database. */
async function protect(req, res, next) {
  const user = await resolveUser(req);
  if (!user) throw ApiError.unauthorized();
  req.user = user;
  next();
}

/** Attaches req.user when a token is sent, but lets anonymous requests through. */
async function optionalAuth(req, res, next) {
  req.user = await resolveUser(req).catch(() => null);
  next();
}

const authorize = (...roles) => (req, res, next) => {
  if (!req.user || !roles.includes(req.user.role)) throw ApiError.forbidden();
  next();
};

module.exports = { signToken, protect, optionalAuth, authorize, staffOnly: authorize('faculty', 'admin'), adminOnly: authorize('admin') };
