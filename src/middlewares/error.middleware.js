import { isCelebrateError } from 'celebrate';
import { Prisma } from '@prisma/client';
import { AppError } from '../utils/AppError.js';
import { logger } from '../config/logger.js';

/**
 * Global catch-all error handling middleware.
 *
 * Handles errors in three distinct categories:
 *  1. Celebrate/Joi validation errors → 400 Bad Request
 *  2. Typed AppError (NotFoundError, ConflictError, etc.) → their own status
 *  3. Prisma known errors → mapped to HTTP semantics (P2002→409, P2025→404)
 *  4. Unexpected errors → 500 Internal Server Error
 *
 * Per Express docs (Context7): error handler MUST have 4 parameters and
 * MUST be the last middleware registered.
 *
 * @param {Error} err
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
function errorMiddleware(err, req, res, next) {
  // --- 1. Celebrate/Joi validation errors → 400 ---
  if (isCelebrateError(err)) {
    const details = [];
    for (const [segment, joiError] of err.details.entries()) {
      details.push(`${segment}: ${joiError.message}`);
    }
    const message = details.length > 0 ? details.join('; ') : 'Validation error';
    return res.status(400).json({
      statusCode: 400,
      error: 'Bad Request',
      message,
    });
  }

  // --- 2. Typed AppError (from service/controller layer) ---
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      statusCode: err.statusCode,
      error: err.name,
      message: err.message,
    });
  }

  // --- 3. Prisma known request errors — centralized mapping ---
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === 'P2002') {
      // Unique constraint violation
      return res.status(409).json({
        statusCode: 409,
        error: 'Conflict',
        message: 'A resource with these unique fields already exists',
      });
    }
    if (err.code === 'P2025') {
      // Record not found
      return res.status(404).json({
        statusCode: 404,
        error: 'Not Found',
        message: 'The requested resource was not found',
      });
    }
  }

  // --- 4. Unexpected / unhandled errors → 500 ---
  const statusCode = err.statusCode || err.status || 500;
  const message = err.message || 'Internal Server Error';

  logger.error({ err, statusCode }, `[Error] ${statusCode} - ${message}`);

  res.status(statusCode).json({
    statusCode,
    error: statusCode === 500 ? 'Internal Server Error' : (err.name || 'Error'),
    message: statusCode === 500 ? 'An unexpected error occurred on the server.' : message,
  });
}

export default errorMiddleware;
