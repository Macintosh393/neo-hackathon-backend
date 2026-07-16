/**
 * Google Calendar Sync and View Controller stub.
 */
exports.getView = async (req, res, next) => {
  try {
    const { startDate, endDate } = req.query;
    res.status(200).json({
      view: {
        startDate,
        endDate,
        totalDays: 35
      },
      calendar: {
        '2026-07-15': {
          sessions: [
            {
              id: '44444444-4444-4444-4444-444444444444',
              projectId: '33333333-3333-3333-3333-333333333333',
              title: 'Проєктування схеми БД',
              courseName: 'Бази даних',
              startTime: '2026-07-15T18:00:00.000Z',
              endTime: '2026-07-15T20:00:00.000Z',
              durationMinutes: 120,
              status: 'SCHEDULED',
              isCompromised: false,
              compromiseReason: null
            }
          ],
          deadlines: []
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

exports.sync = async (req, res, next) => {
  try {
    res.status(200).json({
      message: 'Sync successful',
      scheduledSessionsCount: 5
    });
  } catch (error) {
    next(error);
  }
};

exports.recalculate = async (req, res, next) => {
  try {
    res.status(200).json({
      message: 'Recalculated successfully',
      rescheduledSessionsCount: 3
    });
  } catch (error) {
    next(error);
  }
};
