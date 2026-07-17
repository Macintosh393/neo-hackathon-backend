/**
 * Course Controller
 *
 * Thin HTTP adapter. Prisma error codes are no longer checked here —
 * the centralized error middleware handles P2002 (409) and P2025 (404).
 */

import prisma from '../prisma.js';
import asyncHandler from '../utils/asyncHandler.js';

/**
 * GET /api/courses
 * Returns all courses owned by the authenticated user.
 */
export const getCourses = asyncHandler(async (req, res) => {
  const courses = await prisma.course.findMany({
    where: { userId: req.user.id },
  });
  res.status(200).json(courses);
});

/**
 * POST /api/courses
 * Creates a new course for the authenticated user.
 * Prisma P2002 (unique violation) is handled centrally → 409 Conflict.
 */
export const createCourse = asyncHandler(async (req, res) => {
  const course = await prisma.course.create({
    data: { userId: req.user.id, name: req.body.name },
  });
  res.status(201).json(course);
});

/**
 * PUT /api/courses/:id
 * Renames a course. Only the owning user may update.
 * Prisma P2025 (not found / unauthorized) → 404 Not Found.
 */
export const updateCourse = asyncHandler(async (req, res) => {
  const course = await prisma.course.update({
    where: { id: req.params.id, userId: req.user.id },
    data: { name: req.body.name },
  });
  res.status(200).json(course);
});

/**
 * DELETE /api/courses/:id
 * Deletes a course and all cascading projects/sessions.
 * Prisma P2025 → 404 Not Found.
 */
export const deleteCourse = asyncHandler(async (req, res) => {
  await prisma.course.delete({
    where: { id: req.params.id, userId: req.user.id },
  });
  res.status(204).end();
});

export default { getCourses, createCourse, updateCourse, deleteCourse };
