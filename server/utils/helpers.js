const mongoose = require('mongoose');
const ApiError = require('./ApiError');

/** Copy only whitelisted keys that are actually present. */
const pick = (obj = {}, keys) => keys.reduce((acc, k) => { if (obj[k] !== undefined) acc[k] = obj[k]; return acc; }, {});
const escapeRegex = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const rx = (s) => new RegExp(escapeRegex(String(s).trim()), 'i');
const isId = (v) => typeof v === 'string' && /^[a-f\d]{24}$/i.test(v);
const isStaff = (user) => user.role === 'faculty' || user.role === 'admin';

function assertId(v, label = 'id') {
  if (!isId(String(v || ''))) throw ApiError.badRequest(`Invalid ${label}: "${v}" is not a valid identifier`);
  return new mongoose.Types.ObjectId(String(v));
}

/** Builds a Mongoose sort object from ?sort=field&order=asc|desc, restricted to allowed fields. */
function sortFrom(query, allowed, fallback) {
  const field = allowed.includes(query.sort) ? query.sort : null;
  if (!field) return fallback;
  return { [field]: query.order === 'desc' ? -1 : 1, _id: 1 };
}

/** Turns [{_id, count}] aggregation rows into {key: count} with zeroes for missing keys. */
function countMap(rows, keys = []) {
  const out = Object.fromEntries(keys.map((k) => [k, 0]));
  rows.forEach((r) => { out[r._id] = r.count; });
  return out;
}

module.exports = { pick, escapeRegex, rx, isId, isStaff, assertId, sortFrom, countMap };
