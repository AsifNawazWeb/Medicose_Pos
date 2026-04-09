const { AppError } = require('../utils/errors');
const { logger } = require('../utils/logger');

function errorMiddleware(err, req, res, _next) {
  const isApp = err instanceof AppError;

  const status = isApp ? err.statusCode : 500;
  const payload = {
    ok: false,
    error: {
      message: isApp ? err.message : 'Internal Server Error',
      code: isApp ? err.code : 'INTERNAL_ERROR',
      details: isApp ? err.details : null,
    },
  };

  logger.error({ err, path: req.path, method: req.method }, 'request error');
  res.status(status).json(payload);
}

module.exports = { errorMiddleware };
