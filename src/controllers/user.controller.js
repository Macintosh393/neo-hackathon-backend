/**
 * User Controller
 *
 * Handles user profile and persona questionnaire endpoints.
 * Uses asyncHandler and throws typed NotFoundError instead of inline responses.
 */

import prisma from '../prisma.js';
import asyncHandler from '../utils/asyncHandler.js';
import { NotFoundError } from '../utils/AppError.js';
import calendarService from '../services/googleCalendar.service.js';
import { logger } from '../config/logger.js';

/**
 * GET /api/users/me
 * Returns the authenticated user's profile (id, email, persona, createdAt).
 * Throws NotFoundError if the user record is somehow missing.
 */
export const getMe = asyncHandler(async (req, res) => {
  const user = await prisma.user.findUnique({ where: { id: req.user.id } });

  if (!user) {
    throw new NotFoundError('User profile not found');
  }

  res.status(200).json({
    id: user.id,
    email: user.email,
    name: user.name,
    persona: user.persona,
    createdAt: user.createdAt,
  });
});

/**
 * PUT /api/users/persona
 * Saves the user's study persona questionnaire answers.
 * These drive the scheduling algorithm's preferences.
 */
export const updatePersona = asyncHandler(async (req, res) => {
  const { courseYear, preferredTime, studyOnWeekends, maxHoursPerDay, timezone } = req.body;

  const updateData = {
    persona: { courseYear, preferredTime, studyOnWeekends, maxHoursPerDay },
  };
  if (timezone) updateData.timezone = timezone;

  const user = await prisma.user.update({
    where: { id: req.user.id },
    data: updateData,
  });

  res.status(200).json({
    id: user.id,
    email: user.email,
    name: user.name,
    persona: user.persona,
    timezone: user.timezone,
    createdAt: user.createdAt,
  });
});

/**
 * DELETE /api/users/me/data
 * Deletes all the user's courses (cascades to projects and sessions)
 * and removes all auto-scheduled study session events from Google Calendar.
 * Calendar wipe is best-effort — failure is logged but does not block DB deletion.
 */
export const resetUserData = asyncHandler(async (req, res) => {
  const userId = req.user.id;

  // 1 month back → 3 months forward covers all relevant scheduled sessions
  const rangeStart = new Date();
  rangeStart.setMonth(rangeStart.getMonth() - 1);
  const rangeEnd = new Date();
  rangeEnd.setMonth(rangeEnd.getMonth() + 3);

  // Best-effort Google Calendar wipe — non-fatal if user has no token
  try {
    await calendarService.clearEvents(userId, rangeStart, rangeEnd);
  } catch (err) {
    logger.warn({ err, userId }, '[resetUserData] Calendar wipe failed — continuing with DB deletion');
  }

  // Delete all courses; Cascade takes care of Projects → StudySessions
  const { count } = await prisma.course.deleteMany({ where: { userId } });

  res.status(200).json({
    message: 'All user data cleared successfully.',
    deleted: { courses: count },
  });
});

export default { getMe, updatePersona, resetUserData };
