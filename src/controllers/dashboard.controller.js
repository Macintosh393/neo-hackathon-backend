/**
 * Dashboard Controller
 *
 * SPEC.md §5.4 Performance Rule:
 *   "Fetching all projects and sessions into the Node.js event loop to
 *    calculate percentages using .map() and .reduce() is strictly prohibited."
 *
 * All aggregations are performed at the database level using Prisma's
 * groupBy + _count. Node.js only formats the pre-aggregated results.
 */

import prisma from '../prisma.js';
import { differenceInCalendarDays, startOfDay, endOfDay } from 'date-fns';
import asyncHandler from '../utils/asyncHandler.js';

/**
 * GET /api/dashboard
 *
 * Runs 4 parallel DB queries — each returns pre-aggregated data:
 *  1. Session counts grouped by (projectId, status)  → completion metrics
 *  2. Projects with course/deadline metadata          → deadline list
 *  3. Course list (id, name)                          → course index
 *  4. Today's agenda sessions                         → daily schedule
 */
export const getDashboard = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const today = new Date();

  // ── 1. DB-level aggregation: session counts per project per status ──────────
  // Returns: [{ projectId, status, _count: { id: N } }, ...]
  const sessionCountsPromise = prisma.studySession.groupBy({
    by: ['projectId', 'status'],
    where: { project: { course: { userId } } },
    _count: { id: true },
  });

  // ── 2. Projects with course name and deadline (no sessions loaded) ──────────
  const projectsPromise = prisma.project.findMany({
    where: { course: { userId } },
    select: {
      id: true,
      title: true,
      deadline: true,
      estimatedDifficulty: true,
      courseId: true,
      course: { select: { id: true, name: true } },
    },
    orderBy: { deadline: 'asc' },
  });

  // ── 3. Today's agenda ───────────────────────────────────────────────────────
  const todaysSessionsPromise = prisma.studySession.findMany({
    where: {
      project: { course: { userId } },
      startTime: { gte: startOfDay(today), lte: endOfDay(today) },
    },
    select: {
      id: true,
      projectId: true,
      title: true,
      startTime: true,
      endTime: true,
      status: true,
      isCompromised: true,
      compromiseReason: true,
      project: { select: { course: { select: { name: true } } } },
    },
    orderBy: { startTime: 'asc' },
  });

  const [sessionCounts, projects, todaysSessions] = await Promise.all([
    sessionCountsPromise,
    projectsPromise,
    todaysSessionsPromise,
  ]);

  // ── Build lookup map: projectId → { total, completed, missed } ─────────────
  const sessionMap = {};
  for (const row of sessionCounts) {
    if (!sessionMap[row.projectId]) {
      sessionMap[row.projectId] = { total: 0, completed: 0, missed: 0 };
    }
    sessionMap[row.projectId].total += row._count.id;
    if (row.status === 'COMPLETED') sessionMap[row.projectId].completed += row._count.id;
    if (row.status === 'MISSED') sessionMap[row.projectId].missed += row._count.id;
  }

  // ── Build lookup map: courseId → { id, name } ─────────────────────────────
  const courseMap = {};
  for (const p of projects) {
    if (!courseMap[p.courseId]) {
      courseMap[p.courseId] = { id: p.course.id, name: p.course.name };
    }
  }

  // ── Aggregate overall + per-course progress (pure index math, O(n)) ─────────
  let totalProjects = 0;
  let completedProjects = 0;
  let totalSessions = 0;
  let completedSessions = 0;

  // courseId → { totalSessions, completedSessions, totalProjects, completedProjects }
  const courseStats = {};

  const upcomingDeadlines = projects.map((project) => {
    const stats = sessionMap[project.id] || { total: 0, completed: 0 };
    const isComplete = stats.total > 0 && stats.total === stats.completed;

    totalProjects++;
    totalSessions += stats.total;
    completedSessions += stats.completed;
    if (isComplete) completedProjects++;

    if (!courseStats[project.courseId]) {
      courseStats[project.courseId] = {
        totalSessions: 0,
        completedSessions: 0,
        totalProjects: 0,
        completedProjects: 0,
      };
    }
    courseStats[project.courseId].totalSessions += stats.total;
    courseStats[project.courseId].completedSessions += stats.completed;
    courseStats[project.courseId].totalProjects++;
    if (isComplete) courseStats[project.courseId].completedProjects++;

    return {
      projectId: project.id,
      courseName: project.course.name,
      title: project.title,
      deadline: project.deadline,
      estimatedDifficulty: project.estimatedDifficulty || 'medium',
      daysLeft: differenceInCalendarDays(new Date(project.deadline), today),
      progressPercentage:
        stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0,
    };
  });

  // upcomingDeadlines is already ordered by deadline asc (DB ORDER BY above)

  const coursesProgress = Object.entries(courseStats).map(([courseId, stats]) => ({
    courseId,
    courseName: courseMap[courseId]?.name || 'Unknown',
    totalProjects: stats.totalProjects,
    completedProjects: stats.completedProjects,
    percentage:
      stats.totalSessions > 0
        ? Math.round((stats.completedSessions / stats.totalSessions) * 100)
        : 0,
  }));

  const todaysAgenda = todaysSessions.map((session) => ({
    sessionId: session.id,
    projectId: session.projectId,
    courseName: session.project?.course?.name || 'Unknown',
    title: session.title,
    startTime: session.startTime,
    endTime: session.endTime,
    status: session.status,
    isCompromised: session.isCompromised,
    compromiseReason: session.compromiseReason,
  }));

  res.status(200).json({
    overallProgress: {
      totalProjects,
      completedProjects,
      totalSessions,
      completedSessions,
      percentage: totalSessions > 0 ? Math.round((completedSessions / totalSessions) * 100) : 0,
    },
    coursesProgress,
    upcomingDeadlines,
    todaysAgenda,
  });
});

export default { getDashboard };
