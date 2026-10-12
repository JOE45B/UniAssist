// JSON 404 catch-all + centralized error handler. Every error leaves as { "message": "..." }.
function notFound(req, res) {
  res.status(404).json({ message: `Route not found: ${req.method} ${req.originalUrl}` });
}

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  let status = err.status || err.statusCode || 500;
  let message = err.message || 'Something went wrong';

  if (err.name === 'ValidationError' && err.errors) {
    status = 400;
    message = Object.values(err.errors).map((e) => (e.name === 'CastError' ? `Invalid value for ${e.path}` : e.message)).join('; ');
  } else if (err.name === 'CastError') {
    status = 400;
    message = `Invalid ${err.path}: "${err.value}"`;
  } else if (err.code === 11000) {
    status = 409;
    const field = Object.keys(err.keyPattern || err.keyValue || {})[0];
    message = field ? `That ${field} is already in use` : 'Duplicate value';
  } else if (err.type === 'entity.parse.failed') {
    status = 400;
    message = 'Request body is not valid JSON';
  }

  if (status >= 500) {
    console.error(err);
    if (process.env.NODE_ENV === 'production') message = 'Internal server error';
  }
  res.status(status).json({ message });
}

module.exports = { notFound, errorHandler };
