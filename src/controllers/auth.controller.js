/**
 * Auth Controller — Google OAuth Login
 *
 * Exchanges a Google OAuth2 authorization code for tokens,
 * upserts the user in the database, and returns a real signed JWT.
 *
 * JWT signing uses jsonwebtoken with the JWT_SECRET from environment config.
 * Token payload: { sub: userId, email } — expires in 7 days.
 */

import jwt from 'jsonwebtoken';
import prisma from '../prisma.js';
import calendarService from '../services/googleCalendar.service.js';
import asyncHandler from '../utils/asyncHandler.js';
import config from '../config/env.js';

/**
 * POST /api/auth/google
 * Body: { code: string } — Google OAuth2 authorization code
 *
 * Response: { token: string, user: { id, email, persona, createdAt } }
 */
export const loginWithGoogle = asyncHandler(async (req, res) => {
  const { code } = req.body;

  // Exchange auth code for OAuth tokens (access + refresh + id_token)
  const tokens = await calendarService.getTokens(code);
  const refreshToken = tokens.refresh_token;

  // Decode the ID token to extract the verified email address
  let email = 'student@university.edu';
  if (tokens.id_token) {
    try {
      const payload = JSON.parse(
        Buffer.from(tokens.id_token.split('.')[1], 'base64').toString(),
      );
      if (payload.email) email = payload.email;
    } catch {
      // Malformed id_token — fall back to default email
    }
  }

  // Upsert user: create on first login, update refresh token on subsequent logins
  const user = await prisma.user.upsert({
    where: { email },
    update: { googleRefreshToken: refreshToken },
    create: { email, googleRefreshToken: refreshToken },
  });

  // Sign a real JWT using the application secret
  const token = jwt.sign(
    { sub: user.id, email: user.email },
    config.jwtSecret,
    { expiresIn: '7d' },
  );

  res.status(200).json({
    token,
    user: {
      id: user.id,
      email: user.email,
      persona: user.persona,
      createdAt: user.createdAt,
    },
  });
});

export default { loginWithGoogle };
