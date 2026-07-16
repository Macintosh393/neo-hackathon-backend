/**
 * User Profile and Persona Controller stub.
 */
exports.getMe = async (req, res, next) => {
  try {
    res.status(200).json({
      id: req.user.id,
      email: req.user.email,
      persona: {
        courseYear: 3,
        preferredTime: 'evening',
        studyOnWeekends: false,
        maxHoursPerDay: 4
      },
      createdAt: new Date().toISOString()
    });
  } catch (error) {
    next(error);
  }
};

exports.updatePersona = async (req, res, next) => {
  try {
    const { courseYear, preferredTime, studyOnWeekends, maxHoursPerDay } = req.body;
    res.status(200).json({
      id: req.user.id,
      email: req.user.email,
      persona: {
        courseYear,
        preferredTime,
        studyOnWeekends,
        maxHoursPerDay
      },
      createdAt: new Date().toISOString()
    });
  } catch (error) {
    next(error);
  }
};
