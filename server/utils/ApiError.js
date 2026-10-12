class ApiError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
  static badRequest(msg) { return new ApiError(400, msg); }
  static unauthorized(msg = 'Authentication required') { return new ApiError(401, msg); }
  static forbidden(msg = 'You do not have permission to do that') { return new ApiError(403, msg); }
  static notFound(msg = 'Resource not found') { return new ApiError(404, msg); }
  static conflict(msg) { return new ApiError(409, msg); }
}
module.exports = ApiError;
