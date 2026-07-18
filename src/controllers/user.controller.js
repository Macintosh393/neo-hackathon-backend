/**
 * User Controller
 *
 * Handles user profile and persona questionnaire endpoints.
 * Uses asyncHandler and throws typed NotFoundError instead of inline responses.
 */

import prisma from '../prisma.js';
import asyncHandler from '../utils/asyncHandler.js';
import { NotFoundError } from '../utils/AppError.js';

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

export default { getMe, updatePersona };
