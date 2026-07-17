import { isCelebrateError } from 'celebrate';

/**
 * Global catch-all error handling middleware.
 * Parses Celebrate validation errors as 400 Bad Requests and propagates general errors.
 * 
 * @param {Error} err - Caught error object
 * @param {import('express').Request} req - Express Request
 * @param {import('express').Response} res - Express Response
 * @param {import('express').NextFunction} next - Express Next Function
 */
function errorMiddleware(err, req, res, next) {
  // Handle celebrate Joi validation errors
  if (isCelebrateError(err)) {
    let message = 'Validation error';
    const details = [];
    
    for (const [segment, joiError] of err.details.entries()) {
      details.push(`${segment}: ${joiError.message}`);
    }
    
    if (details.length > 0) {
      message = details.join('; ');
    }

    return res.status(400).json({
      statusCode: 400,
      error: 'Bad Request',
      message
    });
  }

  // Handle standard HTTP status errors
  const statusCode = err.statusCode || err.status || 500;
  const message = err.message || 'Internal Server Error';

  console.error(`[Error] ${statusCode} - ${message}`, err.stack);

  res.status(statusCode).json({
    statusCode,
    error: statusCode === 500 ? 'Internal Server Error' : err.name || 'API Error',
    message: statusCode === 500 ? 'An unexpected error occurred on the server.' : message
  });
}

export default errorMiddleware;
