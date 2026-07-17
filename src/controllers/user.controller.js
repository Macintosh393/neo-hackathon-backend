import prisma from '../prisma.js';

/**
 * User Profile and Persona Controller.
 */
export const getMe = async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id }
    });
    
    if (!user) {
      return res.status(404).json({
        statusCode: 404,
        error: 'Not Found',
        message: 'User profile not found'
      });
    }
    
    res.status(200).json({
      id: user.id,
      email: user.email,
      persona: user.persona,
      createdAt: user.createdAt
    });
  } catch (error) {
    next(error);
  }
};

export const updatePersona = async (req, res, next) => {
  try {
    const { courseYear, preferredTime, studyOnWeekends, maxHoursPerDay } = req.body;
    
    const user = await prisma.user.update({
      where: { id: req.user.id },
      data: {
        persona: {
          courseYear,
          preferredTime,
          studyOnWeekends,
          maxHoursPerDay
        }
      }
    });
    
    res.status(200).json({
      id: user.id,
      email: user.email,
      persona: user.persona,
      createdAt: user.createdAt
    });
  } catch (error) {
    next(error);
  }
};

export default {
  getMe,
  updatePersona
};
