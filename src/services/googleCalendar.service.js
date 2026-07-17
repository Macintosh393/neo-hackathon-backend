import { mockGoogleApis } from '../__tests__/mocks/googleCalendar.mock.js';
import { google as realGoogle } from 'googleapis';
import prisma from '../prisma.js';

const google = process.env.NODE_ENV === 'test'
  ? mockGoogleApis.google
  : realGoogle;

export const getAuthUrl = () => {
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID || 'dummy-client-id',
    process.env.GOOGLE_CLIENT_SECRET || 'dummy-client-secret',
    process.env.GOOGLE_CALLBACK_URL || 'http://localhost:3000/api/auth/google/callback'
  );

  return oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: ['https://www.googleapis.com/auth/calendar'],
    prompt: 'consent'
  });
};

export const getTokens = async (code) => {
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID || 'dummy-client-id',
    process.env.GOOGLE_CLIENT_SECRET || 'dummy-client-secret',
    process.env.GOOGLE_CALLBACK_URL || 'http://localhost:3000/api/auth/google/callback'
  );

  const { tokens } = await oauth2Client.getToken(code);
  return tokens;
};

export const getBusySlots = async (userId, startDate, endDate) => {
  const user = await prisma.user.findUnique({
    where: { id: userId }
  });

  if (!user || !user.googleRefreshToken) {
    console.warn('[Google Calendar Service] User has no active Google credentials. Skipping busy slot query.');
    return [];
  }

  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID || 'dummy-client-id',
    process.env.GOOGLE_CLIENT_SECRET || 'dummy-client-secret',
    process.env.GOOGLE_CALLBACK_URL || 'http://localhost:3000/api/auth/google/callback'
  );

  oauth2Client.setCredentials({
    refresh_token: user.googleRefreshToken
  });

  const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

  // Retrieve list of writeable/active calendars
  const { data: calendarList } = await calendar.calendarList.list({
    minAccessRole: 'writer'
  });

  // Filter out read-only holiday and contact calendars
  const filteredItems = (calendarList.items || [])
    .filter(item => !item.id.includes('#holiday') && !item.id.includes('group.v.calendar.google.com'))
    .map(item => ({ id: item.id }));

  if (filteredItems.length === 0) {
    return [];
  }

  // Request free/busy schedule
  const { data: freebusyData } = await calendar.freebusy.query({
    requestBody: {
      timeMin: new Date(startDate).toISOString(),
      timeMax: new Date(endDate).toISOString(),
      items: filteredItems
    }
  });

  // Flatten and sort busy intervals
  const busySlots = [];
  if (freebusyData.calendars) {
    for (const calId of Object.keys(freebusyData.calendars)) {
      const intervals = freebusyData.calendars[calId].busy || [];
      for (const interval of intervals) {
        busySlots.push({
          start: interval.start,
          end: interval.end
        });
      }
    }
  }

  return busySlots.sort((a, b) => new Date(a.start) - new Date(b.start));
};

export const createEvents = async (userId, sessions) => {
  const user = await prisma.user.findUnique({
    where: { id: userId }
  });

  if (!user || !user.googleRefreshToken) return;

  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID || 'dummy-client-id',
    process.env.GOOGLE_CLIENT_SECRET || 'dummy-client-secret',
    process.env.GOOGLE_CALLBACK_URL || 'http://localhost:3000/api/auth/google/callback'
  );

  oauth2Client.setCredentials({ refresh_token: user.googleRefreshToken });
  const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

  for (const session of sessions) {
    await calendar.events.insert({
      calendarId: 'primary',
      requestBody: {
        summary: session.title,
        description: 'Auto-scheduled study session.',
        start: { dateTime: new Date(session.startTime).toISOString() },
        end: { dateTime: new Date(session.endTime).toISOString() }
      }
    });
  }
};

export const clearEvents = async (userId, startDate, endDate) => {
  const user = await prisma.user.findUnique({
    where: { id: userId }
  });

  if (!user || !user.googleRefreshToken) return;

  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID || 'dummy-client-id',
    process.env.GOOGLE_CLIENT_SECRET || 'dummy-client-secret',
    process.env.GOOGLE_CALLBACK_URL || 'http://localhost:3000/api/auth/google/callback'
  );

  oauth2Client.setCredentials({ refresh_token: user.googleRefreshToken });
  const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

  // Query events scheduled in timeframe
  const { data: eventsList } = await calendar.events.list({
    calendarId: 'primary',
    timeMin: new Date(startDate).toISOString(),
    timeMax: new Date(endDate).toISOString(),
    singleEvents: true
  });

  // Filter study sessions and delete
  const studyEvents = (eventsList.items || []).filter(
    event => event.description && event.description.includes('study session')
  );

  for (const event of studyEvents) {
    await calendar.events.delete({
      calendarId: 'primary',
      eventId: event.id
    });
  }
};

export default {
  getAuthUrl,
  getTokens,
  getBusySlots,
  createEvents,
  clearEvents
};
