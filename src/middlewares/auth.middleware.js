/**
 * JWT Authentication Guard middleware.
 * Verifies Bearer token. Stubs authenticated user context for tests.
 * 
 * @param {import('express').Request} req - Express Request
 * @param {import('express').Response} res - Express Response
 * @param {import('express').NextFunction} next - Express Next Function
 */
function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      statusCode: 401,
      error: 'Unauthorized',
      message: 'Missing or invalid authentication token'
    });
  }

  // Verification stub. In final implementation, decrypts user object from JWT.
  // Pre-populates a mock UUID for development testing.
  req.user = { id: '00000000-0000-0000-0000-000000000000', email: 'mockstudent@university.edu' };
  next();
}

module.exports = authMiddleware;
