const { isId } = require('../utils/helpers');
const ApiError = require('../utils/ApiError');

/** router.param handler: rejects malformed ids with a clear 400 before any query runs. */
module.exports = function validateObjectId(req, res, next, value, name) {
  if (!isId(value)) return next(ApiError.badRequest(`Invalid ${name}: "${value}" is not a valid identifier`));
  next();
};
