const ApiError = require('../utils/ApiError');
const { isStaff, assertId } = require('../utils/helpers');

/** Personal modules (schedules, tasks): always the signed-in user, unless an admin asks for ?user=. */
const personalScope = (req) => ({ user: req.user.role === 'admin' && req.query.user ? assertId(req.query.user, 'user') : req.user._id });

/** Shared modules (requests, appointments, reservations): students see their own, staff see all. */
function sharedScope(req) {
  if (!isStaff(req.user) || req.query.mine === 'true') return { user: req.user._id };
  return req.query.user ? { user: assertId(req.query.user, 'user') } : {};
}

async function loadOr404(Model, id, label) {
  const doc = await Model.findById(id);
  if (!doc) throw ApiError.notFound(`${label} not found`);
  return doc;
}

const isOwner = (doc, user) => String(doc.user?._id || doc.user) === String(user._id);

function assertCanAccess(doc, req, { staffAllowed = true } = {}) {
  if (isOwner(doc, req.user)) return;
  if (staffAllowed && isStaff(req.user)) return;
  if (req.user.role === 'admin') return;
  throw ApiError.forbidden();
}

module.exports = { personalScope, sharedScope, loadOr404, isOwner, assertCanAccess };
