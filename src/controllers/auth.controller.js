/**
 * Auth Controller stub for Google OAuth login.
 */
exports.loginWithGoogle = async (req, res, next) => {
  try {
    const { code } = req.body;
    res.status(200).json({
      token: 'mock-jwt-token-xyz',
      user: {
        id: '00000000-0000-0000-0000-000000000000',
        email: 'mockstudent@university.edu',
        persona: null,
        createdAt: new Date().toISOString()
      }
    });
  } catch (error) {
    next(error);
  }
};
