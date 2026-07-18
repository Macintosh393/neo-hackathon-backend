/**
 * Project Service — Business Logic Layer
 *
 * Extracts all domain orchestration from project.controller.js into a
 * testable, framework-agnostic service. Controllers become thin HTTP
 * adapters that delegate here.
 *
 * Orchestration sequence for project creation:
 *   1. Verify course ownership (DB)
 *   2. Fetch user persona (DB)
 *   3. AI task decomposition (Gemini)
 *   4. Fetch Google Calendar busy slots (optional, soft-fail)
 *   5. Run Greedy Scheduler (pure function)
 *   6. Persist project + sessions in a single DB transaction
 *   7. Write events to Google Calendar (optional, soft-fail)
 */

import prisma from '../prisma.js';
import greedyScheduler from './scheduling/greedyScheduler.js';
import aiAdapter from './ai/ai.adapter.js';
import calendarService from './googleCalendar.service.js';
import { logger } from '../config/logger.js';
import { DEFAULT_PERSONA } from '../constants/persona.js';
import { NotFoundError, ConflictError } from '../utils/AppError.js';
import { Prisma } from '@prisma/client';

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Assembles and persists a single project with its scheduled sessions
 * inside a Prisma transaction.
 *
 * @param {object} tx - Prisma transaction client
 * @param {string} courseId
 * @param {object} projectData - { title, description, deadline }
 * @param {string} difficulty - AI-estimated difficulty
 * @param {Array}  scheduledSessions - Output of greedyScheduler
 * @returns {object} Project with sessions
 */
async function persistProjectWithSessions(tx, courseId, projectData, difficulty, scheduledSessions) {
  const project = await tx.project.create({
    data: {
      courseId,
      title: projectData.title,
      description: projectData.description || null,
      deadline: new Date(projectData.deadline),
      estimatedDifficulty: difficulty,
    },
  });

  const sessionsData = scheduledSessions.map((s) => ({
    projectId: project.id,
    title: s.title,
    durationMinutes: s.durationMinutes,
    startTime: new Date(s.startTime),
    endTime: new Date(s.endTime),
    status: 'SCHEDULED',
    isCompromised: s.isCompromised,
    compromiseReason: s.compromiseReason,
  }));

  await tx.studySession.createMany({ data: sessionsData });

  const sessions = await tx.studySession.findMany({
    where: { projectId: project.id },
  });

  return { ...project, sessions };
}

/**
 * Safely fetches Google Calendar busy slots.
 * Logs a warning and returns [] on failure — calendar unavailability
 * must never block project creation.
 *
 * @param {string} userId
 * @param {Date}   startDate
 * @param {Date}   endDate
 * @param {object} log - pino-http child logger bound to the request
 * @returns {Array} busySlots
 */
async function safeFetchBusySlots(userId, startDate, endDate, log) {
  try {
    return await calendarService.getBusySlots(userId, startDate, endDate);
  } catch (err) {
    log.warn({ err }, 'Failed to retrieve busy slots from Google Calendar, using empty schedule');
    return [];
  }
}

/**
 * Safely writes sessions to Google Calendar.
 * Logs a warning on failure — calendar sync must never block DB persistence.
 *
 * @param {string} userId
 * @param {Array}  sessions
 * @param {object} log - pino-http child logger
 * @param {string} [context] - Extra context for the log message
 */
async function safeCreateCalendarEvents(userId, sessions, log, context = '') {
  try {
    await calendarService.createEvents(userId, sessions);
  } catch (err) {
    log.warn({ err }, `Google Calendar event writing failed${context ? ` (${context})` : ''}`);
  }
}

// ---------------------------------------------------------------------------
// Exported service functions
// ---------------------------------------------------------------------------

/**
 * Returns all projects belonging to the authenticated user,
 * optionally filtered by course and/or completion status.
 *
 * @param {string} userId
 * @param {{ courseId?: string, status?: string }} filters
 * @returns {Array} projects
 */
export async function getProjects(userId, { courseId, status } = {}) {
  const where = { course: { userId } };
  if (courseId) where.courseId = courseId;

  let projects = await prisma.project.findMany({
    where,
    include: { sessions: true },
  });

  if (status) {
    projects = projects.filter((project) => {
      const allCompleted =
        project.sessions.length > 0 &&
        project.sessions.every((s) => s.status === 'COMPLETED');
      return status === 'completed' ? allCompleted : !allCompleted;
    });
  }

  return projects;
}

/**
 * Fetches a single project by ID.
 * Throws NotFoundError if not found.
 *
 * @param {string} id
 * @returns {object} project
 */
export async function getProjectById(id) {
  const project = await prisma.project.findUnique({
    where: { id },
    include: { sessions: true },
  });

  if (!project) {
    throw new NotFoundError('Project not found');
  }

  return project;
}

/**
 * Creates a project with AI-decomposed and greedy-scheduled sessions.
 *
 * @param {string} userId
 * @param {{ courseId, title, description, deadline }} dto
 * @param {object} log - pino-http child logger from req.log
 * @returns {object} created project with sessions
 */
export async function createProject(userId, { courseId, title, description, deadline }, log) {
  // 1. Verify the target course exists and belongs to this user
  const course = await prisma.course.findFirst({
    where: { id: courseId, userId },
  });
  if (!course) {
    throw new NotFoundError('Course not found or unauthorized');
  }

  // 2. Load user persona (falls back to defaults if not set)
  const user = await prisma.user.findUnique({ where: { id: userId } });
  const persona = user?.persona || DEFAULT_PERSONA;
  const timezone = user?.timezone || 'Europe/Kyiv';

  // 3. AI task decomposition
  const aiResponse = await aiAdapter.decomposeProject(
    { courseName: course.name, title, description },
    persona,
  );
  const aiSessions = aiResponse.sessions;
  const difficulty = aiResponse.difficulty || 'medium';

  // 4. Soft-fetch Google Calendar busy slots
  const busySlots = await safeFetchBusySlots(userId, new Date(), new Date(deadline), log);

  // 5. Pure scheduling algorithm
  const scheduledSessions = greedyScheduler({
    aiSessions,
    persona,
    busySlots,
    projectDeadline: new Date(deadline),
    startDate: new Date(),
    timezone,
  });

  // 6. Persist atomically
  let result;
  try {
    result = await prisma.$transaction((tx) =>
      persistProjectWithSessions(tx, courseId, { title, description, deadline }, difficulty, scheduledSessions),
    );
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
      throw new ConflictError('A project with this title already exists in this course');
    }
    throw err;
  }

  // 7. Soft-sync to Google Calendar
  await safeCreateCalendarEvents(userId, result.sessions, log);

  return result;
}

/**
 * Batch-imports multiple projects, each with its own AI decomposition and
 * scheduling cycle. Projects that fail processing are skipped and logged —
 * one failure must not abort the rest of the batch.
 *
 * @param {string} userId
 * @param {Array}  projects - Array of { courseName, title, description, deadline }
 * @param {object} log - pino-http child logger
 * @returns {{ importedProjects: Array, failedCount: number }}
 */
export async function batchImportProjects(userId, projects, log) {
  // Load persona and timezone once for the whole batch
  const user = await prisma.user.findUnique({ where: { id: userId } });
  const persona = user?.persona || DEFAULT_PERSONA;
  const timezone = user?.timezone || 'Europe/Kyiv';

  const importedProjects = [];
  let failedCount = 0;

  for (const p of projects) {
    try {
      // Find or create course by name (upsert-like pattern)
      let course = await prisma.course.findFirst({
        where: { name: p.courseName, userId },
      });
      if (!course) {
        course = await prisma.course.create({
          data: { name: p.courseName, userId },
        });
      }

      // AI decomposition
      const aiResponse = await aiAdapter.decomposeProject(
        { courseName: course.name, title: p.title, description: p.description },
        persona,
      );
      const aiSessions = aiResponse.sessions;
      const difficulty = aiResponse.difficulty || 'medium';

      // Soft-fetch busy slots
      const busySlots = await safeFetchBusySlots(
        userId,
        new Date(),
        new Date(p.deadline),
        log,
      );

      // Schedule
      const scheduledSessions = greedyScheduler({
        aiSessions,
        persona,
        busySlots,
        projectDeadline: new Date(p.deadline),
        startDate: new Date(),
        timezone,
      });

      // Persist
      const result = await prisma.$transaction((tx) =>
        persistProjectWithSessions(
          tx,
          course.id,
          { title: p.title, description: p.description, deadline: p.deadline },
          difficulty,
          scheduledSessions,
        ),
      );

      // Soft-sync calendar
      await safeCreateCalendarEvents(userId, result.sessions, log, `batch: ${p.title}`);

      importedProjects.push(result);
    } catch (err) {
      // Skip this project and continue — per product decision
      failedCount += 1;
      log.warn(
        { err, projectTitle: p.title },
        'Batch import: skipping project due to processing error',
      );
    }
  }

  return { importedProjects, failedCount };
}

/**
 * Partially updates a project's metadata.
 * Throws NotFoundError if the project does not exist.
 *
 * @param {string} id
 * @param {{ title?, description?, deadline? }} updates
 * @returns {object} updated project
 */
export async function updateProject(id, updates) {
  const data = {};
  if (updates.title !== undefined) data.title = updates.title;
  if (updates.description !== undefined) data.description = updates.description;
  if (updates.deadline !== undefined) data.deadline = new Date(updates.deadline);

  try {
    return await prisma.project.update({ where: { id }, data });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2025') {
      throw new NotFoundError('Project not found');
    }
    throw err;
  }
}

/**
 * Deletes a project (cascades to sessions via Prisma schema).
 * Throws NotFoundError if not found.
 *
 * @param {string} id
 */
export async function deleteProject(id) {
  try {
    await prisma.project.delete({ where: { id } });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2025') {
      throw new NotFoundError('Project not found');
    }
    throw err;
  }
}
