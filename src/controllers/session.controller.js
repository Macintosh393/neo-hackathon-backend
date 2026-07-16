const prisma = require('../prisma');

/**
 * Study Session CRUD Controller.
 */
exports.getSessions = async (req, res, next) => {
  try {
    const { startDate, endDate, projectId } = req.query;

    const where = {};
    if (projectId) where.projectId = projectId;
    
    if (startDate || endDate) {
      where.startTime = {};
      if (startDate) where.startTime.gte = new Date(startDate);
      if (endDate) where.startTime.lte = new Date(endDate);
    }

    const sessions = await prisma.studySession.findMany({
      where,
      orderBy: {
        startTime: 'asc'
      }
    });

    res.status(200).json(sessions);
  } catch (error) {
    next(error);
  }
};

exports.createSession = async (req, res, next) => {
  try {
    const { projectId, title, durationMinutes, startTime, endTime } = req.body;

    const session = await prisma.studySession.create({
      data: {
        projectId,
        title,
        durationMinutes,
        startTime: startTime ? new Date(startTime) : null,
        endTime: endTime ? new Date(endTime) : null,
        status: 'SCHEDULED'
      }
    });

    res.status(201).json(session);
  } catch (error) {
    next(error);
  }
};

exports.updateSession = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { startTime, endTime, status } = req.body;

    const data = {};
    if (startTime !== undefined) data.startTime = startTime ? new Date(startTime) : null;
    if (endTime !== undefined) data.endTime = endTime ? new Date(endTime) : null;
    if (status !== undefined) data.status = status;

    const session = await prisma.studySession.update({
      where: { id },
      data
    });

    res.status(200).json(session);
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({
        statusCode: 404,
        error: 'Not Found',
        message: 'Study session not found'
      });
    }
    next(error);
  }
};

exports.deleteSession = async (req, res, next) => {
  try {
    const { id } = req.params;

    await prisma.studySession.delete({
      where: { id }
    });

    res.status(204).end();
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({
        statusCode: 404,
        error: 'Not Found',
        message: 'Study session not found'
      });
    }
    next(error);
  }
};
