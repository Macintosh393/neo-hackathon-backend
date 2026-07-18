import jwt from 'jsonwebtoken';
import config from '../config/env.js';

/**
 * JWT Authentication Guard middleware.
 * Verifies Bearer token and attaches decoded payload to req.user.
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

  const token = authHeader.split(' ')[1];
  
  try {
    const payload = jwt.verify(token, config.jwtSecret);
    req.user = { id: payload.sub, email: payload.email };
    next();
  } catch (err) {
    return res.status(401).json({
      statusCode: 401,
      error: 'Unauthorized',
      message: 'Invalid or expired token'
    });
  }
}

export default authMiddleware;
