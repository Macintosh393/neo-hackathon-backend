/**
 * Google Calendar Service
 *
 * Provides OAuth2-authenticated access to the Google Calendar API.
 * All functions are safe to call when the user has no Google credentials —
 * they return early with empty/void results and log a warning.
 *
 * Note: Mocking of `googleapis` is done exclusively at the Vitest test level
 * via `vi.mock('googleapis')`. This file contains NO test-specific imports.
 */

import { google } from 'googleapis';
import prisma from '../prisma.js';
import { logger } from '../config/logger.js';

/**
 * Builds an authenticated OAuth2 client using the user's stored refresh token.
 * Returns null if the user has no active Google credentials.
 *
 * @param {string} userId
 * @returns {Promise<OAuth2Client|null>}
 */
async function buildAuthClient(userId) {
  const user = await prisma.user.findUnique({ where: { id: userId } });

  if (!user || !user.googleRefreshToken) {
    logger.warn({ userId }, '[Google Calendar Service] User has no active Google credentials.');
    return null;
  }

  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID || 'dummy-client-id',
    process.env.GOOGLE_CLIENT_SECRET || 'dummy-client-secret',
    process.env.GOOGLE_CALLBACK_URL || 'http://localhost:3000/api/auth/google/callback',
  );
  oauth2Client.setCredentials({ refresh_token: user.googleRefreshToken });
  return oauth2Client;
}

/**
 * Generates the Google OAuth2 authorization URL.
 * Used to redirect the user for initial Google account linking.
 *
 * @returns {string} Authorization URL
 */
export const getAuthUrl = () => {
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID || 'dummy-client-id',
    process.env.GOOGLE_CLIENT_SECRET || 'dummy-client-secret',
    process.env.GOOGLE_CALLBACK_URL || 'http://localhost:3000/api/auth/google/callback',
  );

  return oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: [
      'https://www.googleapis.com/auth/calendar',
      'https://www.googleapis.com/auth/userinfo.email',
      'https://www.googleapis.com/auth/userinfo.profile',
    ],
    prompt: 'consent',
  });
};

/**
 * Exchanges an OAuth2 authorization code for tokens.
 *
 * @param {string} code - Authorization code from Google OAuth callback
 * @returns {Promise<object>} Token object containing refresh_token, id_token, etc.
 */
export const getTokens = async (code) => {
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID || 'dummy-client-id',
    process.env.GOOGLE_CLIENT_SECRET || 'dummy-client-secret',
    process.env.GOOGLE_CALLBACK_URL || 'http://localhost:3000/api/auth/google/callback',
  );

  const { tokens } = await oauth2Client.getToken(code);
  return tokens;
};

/**
 * Retrieves merged busy time slots from all active writable calendars.
 * Filters out holiday and contacts calendars to avoid false conflicts.
 *
 * @param {string} userId
 * @param {Date}   startDate
 * @param {Date}   endDate
 * @returns {Promise<Array<{ start: string, end: string }>>} Sorted busy intervals
 */
export const getBusySlots = async (userId, startDate, endDate) => {
  const authClient = await buildAuthClient(userId);
  if (!authClient) return [];

  const calendar = google.calendar({ version: 'v3', auth: authClient });

  // Fetch ALL calendars the user can see.
  // GOOGLE_CALENDAR_INTEGRATION.md: "Keep calendars where the user is owner
  // or writer, plus any specific shared university calendars" — so we must
  // NOT restrict by minAccessRole here, otherwise read-only shared class
  // schedules would be invisible to the scheduler.
  const { data: calendarList } = await calendar.calendarList.list();

  // Filter out only clearly generic / non-personal calendars:
  //  - #holiday@group.v.calendar.google.com  (national holidays)
  //  - #contacts@group.v.calendar.google.com  (birthdays from contacts)
  //  - weather@group.v.calendar.google.com    (weather forecasts)
  // We intentionally KEEP university-shared calendars regardless of accessRole.
  const GENERIC_CALENDAR_PATTERNS = [
    'holiday@group.v.calendar.google.com',   // covers both en.uk#holiday@... and holiday@...
    'contacts@group.v.calendar.google.com',
    'weather@group.v.calendar.google.com',
  ];

  const filteredItems = (calendarList.items || [])
    .filter(
      (item) => !GENERIC_CALENDAR_PATTERNS.some((pattern) => item.id.includes(pattern)),
    )
    .map((item) => ({ id: item.id }));

  if (filteredItems.length === 0) return [];

  // Request free/busy schedule across all filtered calendars
  const { data: freebusyData } = await calendar.freebusy.query({
    requestBody: {
      timeMin: new Date(startDate).toISOString(),
      timeMax: new Date(endDate).toISOString(),
      items: filteredItems,
    },
  });

  // Flatten and sort busy intervals from all calendars
  const busySlots = [];
  if (freebusyData.calendars) {
    for (const calId of Object.keys(freebusyData.calendars)) {
      const intervals = freebusyData.calendars[calId].busy || [];
      for (const interval of intervals) {
        busySlots.push({ start: interval.start, end: interval.end });
      }
    }
  }

  return busySlots.sort((a, b) => new Date(a.start) - new Date(b.start));
};

/**
 * Writes study session events to the user's primary Google Calendar.
 * No-ops silently if the user has no linked Google account.
 *
 * @param {string} userId
 * @param {Array<{ title, startTime, endTime }>} sessions
 */
export const createEvents = async (userId, sessions) => {
  const authClient = await buildAuthClient(userId);
  if (!authClient) return;

  const calendar = google.calendar({ version: 'v3', auth: authClient });

  for (const session of sessions) {
    await calendar.events.insert({
      calendarId: 'primary',
      requestBody: {
        summary: session.title,
        description: 'Auto-scheduled study session.',
        start: { dateTime: new Date(session.startTime).toISOString() },
        end: { dateTime: new Date(session.endTime).toISOString() },
      },
    });
  }
};

/**
 * Deletes auto-scheduled study session events from the user's primary calendar
 * within a given time range. Identified by the description marker 'study session'.
 *
 * @param {string} userId
 * @param {Date}   startDate
 * @param {Date}   endDate
 */
export const clearEvents = async (userId, startDate, endDate) => {
  const authClient = await buildAuthClient(userId);
  if (!authClient) return;

  const calendar = google.calendar({ version: 'v3', auth: authClient });

  // Collect all matching events across paginated responses
  const studyEvents = [];
  let pageToken = undefined;

  do {
    const { data: eventsList } = await calendar.events.list({
      calendarId: 'primary',
      timeMin: new Date(startDate).toISOString(),
      timeMax: new Date(endDate).toISOString(),
      singleEvents: true,
      maxResults: 250,
      pageToken,
    });

    const pageStudyEvents = (eventsList.items || []).filter(
      // Use trim() + includes() to guard against Google adding whitespace/newlines
      (event) => event.description?.trim().includes('Auto-scheduled study session.'),
    );

    studyEvents.push(...pageStudyEvents);
    pageToken = eventsList.nextPageToken;
  } while (pageToken);

  logger.info({ userId, count: studyEvents.length }, '[Google Calendar Service] Deleting auto-scheduled events.');

  await Promise.all(
    studyEvents.map((event) =>
      calendar.events.delete({ calendarId: 'primary', eventId: event.id }),
    ),
  );
};

export default { getAuthUrl, getTokens, getBusySlots, createEvents, clearEvents };
