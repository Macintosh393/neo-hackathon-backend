const prisma = require('../prisma');
const calendarService = require('../services/googleCalendar.service');

/**
 * Auth Controller for Google OAuth login.
 */
exports.loginWithGoogle = async (req, res, next) => {
  try {
    const { code } = req.body;

    // Exchange auth code for refresh token
    const tokens = await calendarService.getTokens(code);
    const refreshToken = tokens.refresh_token;

    // Decode ID token to get user email
    let email = 'student@university.edu';
    if (tokens.id_token) {
      try {
        const payload = JSON.parse(Buffer.from(tokens.id_token.split('.')[1], 'base64').toString());
        if (payload.email) email = payload.email;
      } catch (e) {
        // use default fallback email
      }
    }

    // Upsert user and save the refresh token in the database
    const user = await prisma.user.upsert({
      where: { email },
      update: {
        googleRefreshToken: refreshToken
      },
      create: {
        email,
        googleRefreshToken: refreshToken
      }
    });

    res.status(200).json({
      token: 'mock-jwt-token-xyz',
      user: {
        id: user.id,
        email: user.email,
        persona: user.persona,
        createdAt: user.createdAt
      }
    });
  } catch (error) {
    next(error);
  }
};
