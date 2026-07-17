/**
 * Typed application error hierarchy.
 *
 * Using typed Error subclasses with a `.statusCode` property is the
 * canonical Express pattern (per Express error handling docs).
 * The centralized error middleware reads these properties to build
 * consistent HTTP responses without any controller needing to
 * manually call res.status().json().
 */

/**
 * Base application error. Includes an HTTP status code and a short
 * machine-readable error code for API clients.
 */
export class AppError extends Error {
  /**
   * @param {string} message - Human-readable error description
   * @param {number} statusCode - HTTP status code (4xx / 5xx)
   * @param {string} [code] - Machine-readable short code, e.g. 'NOT_FOUND'
   */
  constructor(message, statusCode, code) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.status = statusCode; // Express convention alias
    this.code = code || 'API_ERROR';
    // Maintains proper stack trace in V8
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }
}

/** 400 — Caller sent an invalid or malformed request */
export class BadRequestError extends AppError {
  constructor(message = 'Bad Request') {
    super(message, 400, 'BAD_REQUEST');
  }
}

/** 401 — Missing or invalid authentication credentials */
export class UnauthorizedError extends AppError {
  constructor(message = 'Unauthorized') {
    super(message, 401, 'UNAUTHORIZED');
  }
}

/** 404 — Requested resource does not exist or is not accessible */
export class NotFoundError extends AppError {
  constructor(message = 'Resource not found') {
    super(message, 404, 'NOT_FOUND');
  }
}

/** 409 — Resource already exists (e.g. unique constraint violation) */
export class ConflictError extends AppError {
  constructor(message = 'Resource already exists') {
    super(message, 409, 'CONFLICT');
  }
}
