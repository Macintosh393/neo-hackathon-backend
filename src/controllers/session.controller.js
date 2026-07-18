/**
 * Study Session Controller
 *
 * Thin HTTP adapter. Prisma error codes are handled centrally
 * in the error middleware — no inline res.status() error responses here.
 */

import prisma from '../prisma.js';
import asyncHandler from '../utils/asyncHandler.js';

/**
 * GET /api/sessions
 * Returns sessions filtered by optional projectId, startDate, endDate.
 */
export const getSessions = asyncHandler(async (req, res) => {
  const { startDate, endDate, projectId } = req.query;

  const where = {
    project: { course: { userId: req.user.id } }
  };
  if (projectId) where.projectId = projectId;

  if (startDate || endDate) {
    where.startTime = {};
    if (startDate) where.startTime.gte = new Date(startDate);
    if (endDate) where.startTime.lte = new Date(endDate);
  }

  const sessions = await prisma.studySession.findMany({
    where,
    orderBy: { startTime: 'asc' },
  });

  res.status(200).json(sessions);
});

/**
 * POST /api/sessions
 * Manually creates a study session (primarily for testing/admin use).
 */
export const createSession = asyncHandler(async (req, res) => {
  const { projectId, title, durationMinutes, startTime, endTime } = req.body;

  const project = await prisma.project.findFirst({
    where: { id: projectId, course: { userId: req.user.id } }
  });
  
  if (!project) {
    return res.status(404).json({ message: 'Project not found or unauthorized' });
  }

  const session = await prisma.studySession.create({
    data: {
      projectId,
      title,
      durationMinutes,
      startTime: startTime ? new Date(startTime) : null,
      endTime: endTime ? new Date(endTime) : null,
      status: 'SCHEDULED',
    },
  });

  res.status(201).json(session);
});

/**
 * PUT /api/sessions/:id
 * Updates a session's timing and/or status.
 * Prisma P2025 → 404 (handled centrally).
 */
export const updateSession = asyncHandler(async (req, res) => {
  const { startTime, endTime, status } = req.body;

  const data = {};
  if (startTime !== undefined) data.startTime = startTime ? new Date(startTime) : null;
  if (endTime !== undefined) data.endTime = endTime ? new Date(endTime) : null;
  if (status !== undefined) data.status = status;

  const result = await prisma.studySession.updateMany({
    where: { 
      id: req.params.id,
      project: { course: { userId: req.user.id } }
    },
    data,
  });

  if (result.count === 0) {
    return res.status(404).json({ message: 'Session not found or unauthorized' });
  }

  const updatedSession = await prisma.studySession.findUnique({ where: { id: req.params.id } });
  res.status(200).json(updatedSession);
});

/**
 * DELETE /api/sessions/:id
 * Deletes a study session.
 * Enforces ownership via project -> course -> userId.
 */
export const deleteSession = asyncHandler(async (req, res) => {
  const result = await prisma.studySession.deleteMany({
    where: { 
      id: req.params.id,
      project: { course: { userId: req.user.id } }
    }
  });

  if (result.count === 0) {
    return res.status(404).json({ message: 'Session not found or unauthorized' });
  }

  res.status(204).end();
});

export default { getSessions, createSession, updateSession, deleteSession };
