const { google } = process.env.NODE_ENV === 'test'
  ? require('../__tests__/mocks/googleCalendar.mock').mockGoogleApis
  : require('googleapis');

const prisma = require('../prisma');

// Setup standard OAuth client
const getOAuth2Client = () => {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID || 'mock-client-id',
    process.env.GOOGLE_CLIENT_SECRET || 'mock-client-secret',
    process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3000/oauth2callback'
  );
};

/**
 * Google Calendar Sync and Query Service.
 */
exports.getAuthUrl = () => {
  const client = getOAuth2Client();
  return client.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent',
    scope: [
      'https://www.googleapis.com/auth/calendar',
      'https://www.googleapis.com/auth/calendar.events'
    ]
  });
};

exports.getTokens = async (code) => {
  const client = getOAuth2Client();
  const { tokens } = await client.getToken(code);
  return tokens;
};

exports.getBusySlots = async (userId, startDate, endDate) => {
  const user = await prisma.user.findUnique({
    where: { id: userId }
  });

  if (!user || !user.googleRefreshToken) {
    return [];
  }

  const client = getOAuth2Client();
  client.setCredentials({ refresh_token: user.googleRefreshToken });
  const calendar = google.calendar({ version: 'v3', auth: client });

  // 1. Fetch user's calendars list
  const calendarList = await calendar.calendarList.list();
  const items = calendarList.data.items || [];

  // 2. Filter out generic holidays, weather, or read-only public calendars
  const filteredCalendars = items.filter(cal => {
    const id = cal.id || '';
    const summary = cal.summary || '';
    if (id.includes('#holiday') || id.includes('holiday@group.v.calendar.google.com')) return false;
    if (id.includes('weather') || summary.toLowerCase().includes('weather')) return false;
    if (cal.accessRole === 'reader' && id.includes('group.v.calendar.google.com')) return false;
    return true;
  });

  if (filteredCalendars.length === 0) {
    return [];
  }

  // 3. Request unified freebusy busy schedule
  const response = await calendar.freebusy.query({
    requestBody: {
      timeMin: startDate.toISOString(),
      timeMax: endDate.toISOString(),
      items: filteredCalendars.map(cal => ({ id: cal.id }))
    }
  });

  const calendarsBusy = response.data.calendars || {};
  const busySlots = [];

  for (const calId in calendarsBusy) {
    const busy = calendarsBusy[calId].busy || [];
    busy.forEach(slot => {
      busySlots.push({
        start: slot.start,
        end: slot.end
      });
    });
  }

  return busySlots;
};

exports.createEvents = async (userId, sessions) => {
  const user = await prisma.user.findUnique({
    where: { id: userId }
  });

  if (!user || !user.googleRefreshToken) return;

  const client = getOAuth2Client();
  client.setCredentials({ refresh_token: user.googleRefreshToken });
  const calendar = google.calendar({ version: 'v3', auth: client });

  for (const session of sessions) {
    if (!session.startTime || !session.endTime) continue;
    await calendar.events.insert({
      calendarId: 'primary',
      requestBody: {
        summary: session.title,
        description: 'Study session scheduled by Neoversity AI Planner.',
        start: { dateTime: new Date(session.startTime).toISOString() },
        end: { dateTime: new Date(session.endTime).toISOString() },
        extendedProperties: {
          private: {
            source: 'neoversity',
            sessionId: session.id
          }
        }
      }
    });
  }
};

exports.clearEvents = async (userId, startDate, endDate) => {
  const user = await prisma.user.findUnique({
    where: { id: userId }
  });

  if (!user || !user.googleRefreshToken) return;

  const client = getOAuth2Client();
  client.setCredentials({ refresh_token: user.googleRefreshToken });
  const calendar = google.calendar({ version: 'v3', auth: client });

  const response = await calendar.events.list({
    calendarId: 'primary',
    timeMin: new Date(startDate).toISOString(),
    timeMax: new Date(endDate).toISOString(),
    singleEvents: true
  });

  const events = response.data.items || [];
  for (const event of events) {
    if (event.extendedProperties?.private?.source === 'neoversity') {
      await calendar.events.delete({
        calendarId: 'primary',
        eventId: event.id
      });
    }
  }
};
