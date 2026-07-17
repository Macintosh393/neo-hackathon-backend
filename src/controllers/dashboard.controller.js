import prisma from '../prisma.js';
import { differenceInCalendarDays, startOfDay, endOfDay } from 'date-fns';

/**
 * Dashboard Data Aggregator.
 */
export const getDashboard = async (req, res, next) => {
  try {
    const userId = req.user.id;

    // 1. Fetch all courses with nested projects and sessions for analytics
    const courses = await prisma.course.findMany({
      where: { userId },
      include: {
        projects: {
          include: {
            sessions: true
          }
        }
      }
    });

    // 2. Fetch today's scheduled sessions for the agenda
    const today = new Date();
    const todaysSessions = await prisma.studySession.findMany({
      where: {
        project: {
          course: {
            userId
          }
        },
        startTime: {
          gte: startOfDay(today),
          lte: endOfDay(today)
        }
      },
      include: {
        project: {
          include: {
            course: true
          }
        }
      }
    });

    // --- Compute analytics ---
    let totalProjects = 0;
    let completedProjects = 0;
    let totalSessions = 0;
    let completedSessions = 0;

    const coursesProgress = [];
    const upcomingDeadlines = [];

    courses.forEach(course => {
      let courseTotalProjects = 0;
      let courseCompletedProjects = 0;
      let courseTotalSessions = 0;
      let courseCompletedSessions = 0;

      course.projects.forEach(project => {
        totalProjects++;
        courseTotalProjects++;

        const projTotalSessions = project.sessions.length;
        const projCompletedSessions = project.sessions.filter(s => s.status === 'COMPLETED').length;

        totalSessions += projTotalSessions;
        courseTotalSessions += projTotalSessions;
        completedSessions += projCompletedSessions;
        courseCompletedSessions += projCompletedSessions;

        // A project is completed if it has sessions and all of them are COMPLETED
        const isProjectCompleted = projTotalSessions > 0 && projTotalSessions === projCompletedSessions;
        if (isProjectCompleted) {
          completedProjects++;
          courseCompletedProjects++;
        }

        // Calculate project-level metrics for upcoming deadlines
        const progressPercentage = projTotalSessions > 0 
          ? Math.round((projCompletedSessions / projTotalSessions) * 100)
          : 0;

        upcomingDeadlines.push({
          projectId: project.id,
          courseName: course.name,
          title: project.title,
          deadline: project.deadline,
          estimatedDifficulty: project.estimatedDifficulty || 'medium',
          daysLeft: differenceInCalendarDays(new Date(project.deadline), today),
          progressPercentage
        });
      });

      const coursePercentage = courseTotalSessions > 0
        ? Math.round((courseCompletedSessions / courseTotalSessions) * 100)
        : 0;

      coursesProgress.push({
        courseId: course.id,
        courseName: course.name,
        totalProjects: courseTotalProjects,
        completedProjects: courseCompletedProjects,
        percentage: coursePercentage
      });
    });

    const overallPercentage = totalSessions > 0
      ? Math.round((completedSessions / totalSessions) * 100)
      : 0;

    const overallProgress = {
      totalProjects,
      completedProjects,
      totalSessions,
      completedSessions,
      percentage: overallPercentage
    };

    // Sort upcoming deadlines by deadline date ascending
    upcomingDeadlines.sort((a, b) => new Date(a.deadline) - new Date(b.deadline));

    // Map today's agenda sessions response format
    const todaysAgenda = todaysSessions.map(session => ({
      sessionId: session.id,
      projectId: session.projectId,
      courseName: session.project?.course?.name || 'Unknown',
      title: session.title,
      startTime: session.startTime,
      endTime: session.endTime,
      status: session.status,
      isCompromised: session.isCompromised,
      compromiseReason: session.compromiseReason
    }));

    res.status(200).json({
      overallProgress,
      coursesProgress,
      upcomingDeadlines,
      todaysAgenda
    });

  } catch (error) {
    next(error);
  }
};

export default {
  getDashboard
};
