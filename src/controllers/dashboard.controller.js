/**
 * Dashboard Data Aggregator Controller stub.
 */
exports.getDashboard = async (req, res, next) => {
  try {
    res.status(200).json({
      overallProgress: {
        totalProjects: 12,
        completedProjects: 4,
        totalSessions: 45,
        completedSessions: 15,
        percentage: 33
      },
      coursesProgress: [
        {
          courseId: '11111111-1111-1111-1111-111111111111',
          courseName: 'Бази даних',
          totalProjects: 3,
          completedProjects: 1,
          percentage: 33
        }
      ],
      upcomingDeadlines: [
        {
          projectId: '33333333-3333-3333-3333-333333333333',
          courseName: 'Бази даних',
          title: 'Курсовий проєкт',
          deadline: '2026-07-20T23:59:59.000Z',
          estimatedDifficulty: 'hard',
          daysLeft: 5,
          progressPercentage: 50
        }
      ],
      todaysAgenda: [
        {
          sessionId: '44444444-4444-4444-4444-444444444444',
          projectId: '33333333-3333-3333-3333-333333333333',
          courseName: 'Операційні системи',
          title: 'Написання Bash скрипта (Частина 1)',
          startTime: '2026-07-15T18:00:00.000Z',
          endTime: '2026-07-15T20:00:00.000Z',
          status: 'SCHEDULED',
          isCompromised: false,
          compromiseReason: null
        }
      ]
    });
  } catch (error) {
    next(error);
  }
};
