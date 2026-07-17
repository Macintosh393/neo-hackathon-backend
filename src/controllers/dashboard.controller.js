/**
 * Dashboard Controller
 *
 * Aggregates analytics across all of a user's courses, projects, and sessions.
 * Uses asyncHandler to eliminate try/catch boilerplate.
 */

import prisma from '../prisma.js';
import { differenceInCalendarDays, startOfDay, endOfDay } from 'date-fns';
import asyncHandler from '../utils/asyncHandler.js';

/**
 * GET /api/dashboard
 * Returns an aggregated dashboard payload:
 *  - overallProgress: global session completion metrics
 *  - coursesProgress: per-course completion percentages
 *  - upcomingDeadlines: all project deadlines sorted by urgency
 *  - todaysAgenda: sessions scheduled for today
 */
export const getDashboard = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const today = new Date();

  // Fetch courses + projects + sessions and today's agenda in parallel
  const [courses, todaysSessions] = await Promise.all([
    prisma.course.findMany({
      where: { userId },
      include: { projects: { include: { sessions: true } } },
    }),
    prisma.studySession.findMany({
      where: {
        project: { course: { userId } },
        startTime: { gte: startOfDay(today), lte: endOfDay(today) },
      },
      include: { project: { include: { course: true } } },
    }),
  ]);

  // --- Compute analytics ---
  let totalProjects = 0;
  let completedProjects = 0;
  let totalSessions = 0;
  let completedSessions = 0;

  const coursesProgress = [];
  const upcomingDeadlines = [];

  courses.forEach((course) => {
    let courseTotalSessions = 0;
    let courseCompletedSessions = 0;
    let courseTotalProjects = 0;
    let courseCompletedProjects = 0;

    course.projects.forEach((project) => {
      totalProjects++;
      courseTotalProjects++;

      const projTotal = project.sessions.length;
      const projCompleted = project.sessions.filter((s) => s.status === 'COMPLETED').length;

      totalSessions += projTotal;
      completedSessions += projCompleted;
      courseTotalSessions += projTotal;
      courseCompletedSessions += projCompleted;

      const isProjectCompleted = projTotal > 0 && projTotal === projCompleted;
      if (isProjectCompleted) {
        completedProjects++;
        courseCompletedProjects++;
      }

      const progressPercentage =
        projTotal > 0 ? Math.round((projCompleted / projTotal) * 100) : 0;

      upcomingDeadlines.push({
        projectId: project.id,
        courseName: course.name,
        title: project.title,
        deadline: project.deadline,
        estimatedDifficulty: project.estimatedDifficulty || 'medium',
        daysLeft: differenceInCalendarDays(new Date(project.deadline), today),
        progressPercentage,
      });
    });

    coursesProgress.push({
      courseId: course.id,
      courseName: course.name,
      totalProjects: courseTotalProjects,
      completedProjects: courseCompletedProjects,
      percentage:
        courseTotalSessions > 0
          ? Math.round((courseCompletedSessions / courseTotalSessions) * 100)
          : 0,
    });
  });

  // Sort upcoming deadlines by date ascending (most urgent first)
  upcomingDeadlines.sort((a, b) => new Date(a.deadline) - new Date(b.deadline));

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
