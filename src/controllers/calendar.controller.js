/**
 * Calendar Controller
 *
 * Handles calendar view, sync, and rescheduling endpoints.
 * Uses asyncHandler; req.log (pino-http child logger) is used for
 * soft-failure Google Calendar operations.
 */

import prisma from '../prisma.js';
import { format } from 'date-fns';
import calendarService from '../services/googleCalendar.service.js';
import { rescheduleUserSessions } from '../jobs/cron.js';
import asyncHandler from '../utils/asyncHandler.js';

/**
 * GET /api/calendar/view
 * Returns a keyed-by-date calendar view of sessions and deadlines
 * within the requested date range.
 */
export const getView = asyncHandler(async (req, res) => {
  const { startDate, endDate } = req.query;
  const start = new Date(startDate);
  const end = new Date(endDate);

  const [sessions, projects] = await Promise.all([
    prisma.studySession.findMany({
      where: {
        project: { course: { userId: req.user.id } },
        startTime: { gte: start, lte: end },
      },
      include: { project: { include: { course: true } } },
    }),
    prisma.project.findMany({
      where: {
        course: { userId: req.user.id },
        deadline: { gte: start, lte: end },
      },
      include: { course: true },
    }),
  ]);

  const calendar = {};

  // Group sessions by day (YYYY-MM-DD)
  sessions.forEach((s) => {
    if (!s.startTime) return;
    const dayKey = format(new Date(s.startTime), 'yyyy-MM-dd');
    if (!calendar[dayKey]) calendar[dayKey] = { sessions: [], deadlines: [] };
    calendar[dayKey].sessions.push({
      id: s.id,
      projectId: s.projectId,
      title: s.title,
      courseName: s.project?.course?.name || 'Unknown',
      startTime: s.startTime,
      endTime: s.endTime,
      durationMinutes: s.durationMinutes,
      status: s.status,
      isCompromised: s.isCompromised,
      compromiseReason: s.compromiseReason,
    });
  });

  // Group project deadlines by day (YYYY-MM-DD)
  projects.forEach((p) => {
    const dayKey = format(new Date(p.deadline), 'yyyy-MM-dd');
    if (!calendar[dayKey]) calendar[dayKey] = { sessions: [], deadlines: [] };
    calendar[dayKey].deadlines.push({
      projectId: p.id,
      courseName: p.course.name,
      title: p.title,
      deadline: p.deadline,
      estimatedDifficulty: p.estimatedDifficulty || 'medium',
    });
  });

  const totalDays = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;

  res.status(200).json({
    view: { startDate, endDate, totalDays },
    calendar,
  });
});

/**
 * POST /api/calendar/sync
 * Syncs the user's scheduled sessions to Google Calendar
 * within the requested date range (defaults to today → +30 days).
 */
export const sync = asyncHandler(async (req, res) => {
  const { startDate, endDate } = req.query;
  const start = startDate ? new Date(startDate) : new Date();
  const end = endDate ? new Date(endDate) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

  const sessions = await prisma.studySession.findMany({
    where: {
      project: { course: { userId: req.user.id } },
      startTime: { gte: start, lte: end },
    },
  });

  // Soft-fail: calendar sync failure must not break the response
  try {
    await calendarService.clearEvents(req.user.id, start, end);
    await calendarService.createEvents(req.user.id, sessions);
  } catch (calErr) {
    req.log.warn({ err: calErr }, 'Google Calendar sync connection failed, proceeding with local success');
  }

  res.status(200).json({
    message: 'Sync successful',
    scheduledSessionsCount: sessions.length,
  });
});

/**
 * POST /api/calendar/recalculate
 * Triggers the nightly rescheduling algorithm manually for the current user.
 */
export const recalculate = asyncHandler(async (req, res) => {
  const count = await rescheduleUserSessions(req.user.id);
  res.status(200).json({
    message: 'Recalculated successfully',
    rescheduledSessionsCount: count,
  });
});

export default { getView, sync, recalculate };
