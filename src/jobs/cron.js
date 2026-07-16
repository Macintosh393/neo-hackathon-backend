const prisma = require('../prisma');
const greedyScheduler = require('../services/scheduling/greedyScheduler');
const calendarService = require('../services/googleCalendar.service');
const cron = require('node-cron');

/**
 * Recalculate and reschedule user study sessions starting from now.
 */
const rescheduleUserSessions = async (userId) => {
  const user = await prisma.user.findUnique({
    where: { id: userId }
  });
  if (!user) return 0;

  const persona = user.persona || {
    courseYear: 3,
    preferredTime: 'evening',
    studyOnWeekends: false,
    maxHoursPerDay: 4
  };

  const now = new Date();

  // Find all active projects for the user (deadlines in the future)
  const activeProjects = await prisma.project.findMany({
    where: {
      course: { userId },
      deadline: { gt: now }
    },
    include: {
      sessions: true,
      course: true
    }
  });

  let totalRescheduled = 0;

  for (const project of activeProjects) {
    // 1. Identify study sessions in the past that are still marked as SCHEDULED
    const projectPastScheduled = project.sessions.filter(s => s.status === 'SCHEDULED' && new Date(s.startTime) < now);
    
    // Mark them as MISSED in the database
    for (const ps of projectPastScheduled) {
      await prisma.studySession.update({
        where: { id: ps.id },
        data: { status: 'MISSED' }
      });
    }

    // Workload to reschedule includes:
    // - The past scheduled sessions we just marked as MISSED (so we reschedule their duration)
    // - Future scheduled sessions of this project (which we delete and reschedule to avoid collisions)
    const missedWorkload = projectPastScheduled.map(s => ({
      title: s.title,
      durationMinutes: s.durationMinutes
    }));

    const futureScheduled = project.sessions.filter(s => s.status === 'SCHEDULED' && new Date(s.startTime) >= now);
    const futureWorkload = futureScheduled.map(s => ({
      title: s.title,
      durationMinutes: s.durationMinutes
    }));

    const combinedWorkload = [...missedWorkload, ...futureWorkload];
    if (combinedWorkload.length === 0) continue;

    // Delete future scheduled sessions in DB
    for (const fs of futureScheduled) {
      await prisma.studySession.delete({
        where: { id: fs.id }
      });
    }

    // Retrieve Google Calendar busy slots for this project's timeframe
    let busySlots = [];
    try {
      busySlots = await calendarService.getBusySlots(userId, now, new Date(project.deadline));
    } catch (err) {
      console.warn('Google Calendar busy query failed during rescheduling:', err);
    }

    // Execute scheduler
    const newScheduled = greedyScheduler({
      aiSessions: combinedWorkload,
      persona,
      busySlots,
      projectDeadline: new Date(project.deadline),
      startDate: now
    });

    // Write new scheduled sessions to DB
    const sessionsData = newScheduled.map(s => ({
      projectId: project.id,
      title: s.title,
      durationMinutes: s.durationMinutes,
      startTime: new Date(s.startTime),
      endTime: new Date(s.endTime),
      status: 'SCHEDULED',
      isCompromised: s.isCompromised,
      compromiseReason: s.compromiseReason
    }));

    await prisma.studySession.createMany({
      data: sessionsData
    });

    const updatedSessions = await prisma.studySession.findMany({
      where: { projectId: project.id }
    });

    // Sync updated events to Google Calendar
    try {
      // Clear all scheduled events on Google Calendar for this project range
      await calendarService.clearEvents(userId, now, new Date(project.deadline));
      
      // Write the newly scheduled events
      const futureSessions = updatedSessions.filter(s => s.status === 'SCHEDULED' && new Date(s.startTime) >= now);
      await calendarService.createEvents(userId, futureSessions);
    } catch (calErr) {
      console.warn('Google Calendar event write failed during rescheduling:', calErr);
    }

    totalRescheduled += newScheduled.length;
  }

  return totalRescheduled;
};

/**
 * Initialize nightly cron schedule running at 03:00 daily.
 */
const startCronJob = () => {
  cron.schedule('0 3 * * *', async () => {
    console.log('[Autopilot Cron] Running nightly rescheduling at 03:00...');
    try {
      const users = await prisma.user.findMany();
      for (const user of users) {
        await rescheduleUserSessions(user.id);
      }
      console.log('[Autopilot Cron] Nightly rescheduling completed.');
    } catch (err) {
      console.error('[Autopilot Cron] Error executing nightly rescheduling:', err);
    }
  });
};

module.exports = {
  rescheduleUserSessions,
  startCronJob
};
