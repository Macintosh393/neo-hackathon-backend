/**
 * Google Calendar Service Tests
 *
 * Uses vi.mock() to intercept the `googleapis` module at the Vitest
 * level — no test infrastructure imported into production service code.
 */

import { vi, describe, it, expect, beforeEach } from 'vitest';

// --- Mocks for googleapis ---
const mockCalendarList = vi.fn().mockResolvedValue({
  data: {
    items: [
      { id: 'primary', summary: 'Primary Calendar', accessRole: 'owner' },
      { id: 'holiday@group.v.calendar.google.com', summary: 'Holidays', accessRole: 'reader' },
      { id: 'university-course@group.calendar.google.com', summary: 'Uni Schedule', accessRole: 'writer' },
    ],
  },
});

const mockFreebusyQuery = vi.fn().mockResolvedValue({
  data: {
    calendars: {
      primary: {
        busy: [
          { start: '2026-07-16T09:00:00Z', end: '2026-07-16T11:00:00Z' },
          { start: '2026-07-16T14:00:00Z', end: '2026-07-16T16:00:00Z' },
        ],
      },
      'university-course@group.calendar.google.com': {
        busy: [{ start: '2026-07-16T12:00:00Z', end: '2026-07-16T13:00:00Z' }],
      },
    },
  },
});

const mockSetCredentials = vi.fn();
const mockGetToken = vi.fn().mockResolvedValue({
  tokens: {
    access_token: 'mock-access-token',
    refresh_token: 'mock-refresh-token',
    expiry_date: Date.now() + 3600000,
  },
});
const mockGenerateAuthUrl = vi.fn().mockImplementation((config) => {
  const accessType = config?.access_type || '';
  const prompt = config?.prompt || '';
  return `https://mock-google-auth-url?access_type=${accessType}&prompt=${prompt}`;
});

vi.mock('googleapis', () => ({
  google: {
    calendar: () => ({
      calendarList: { list: mockCalendarList },
      freebusy: { query: mockFreebusyQuery },
    }),
    auth: {
      OAuth2: class OAuth2 {
        constructor() {
          this.setCredentials = mockSetCredentials;
          this.generateAuthUrl = mockGenerateAuthUrl;
          this.getToken = mockGetToken;
        }
      },
    },
  },
}));

import prisma from '../../prisma.js';
import calendarService from '../../services/googleCalendar.service.js';

describe('Google Calendar Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('OAuth Configuration', () => {
    it('getAuthUrl - should request offline access and consent prompt', () => {
      const url = calendarService.getAuthUrl();
      expect(url).toContain('access_type=offline');
      expect(url).toContain('prompt=consent');
    });

    it('getTokens - should exchange code for auth tokens', async () => {
      const tokens = await calendarService.getTokens('mock-auth-code');
      expect(tokens.refresh_token).toBe('mock-refresh-token');
    });
  });

  describe('Calendar Busy Schedule Retrievals', () => {
    it('getBusySlots - should fetch ALL calendars, filter out generic holiday/contacts IDs, and include shared university calendars', async () => {
      // Mock user in database with refresh token
      prisma.user.findUnique.mockResolvedValue({
        id: 'user-123',
        googleRefreshToken: 'refresh-token-abc',
      });

      const startDate = new Date('2026-07-16T00:00:00Z');
      const endDate = new Date('2026-07-16T23:59:59Z');

      const busySlots = await calendarService.getBusySlots('user-123', startDate, endDate);

      // Verify db retrieval
      expect(prisma.user.findUnique).toHaveBeenCalledWith({ where: { id: 'user-123' } });

      // Verify ALL calendars fetched (no minAccessRole filter — must include shared read-only)
      expect(mockCalendarList).toHaveBeenCalledWith();

      // Verify freebusy query called with:
      //  - primary (owner): included
      //  - holiday@group.v.calendar.google.com: EXCLUDED (generic holiday calendar)
      //  - university-course@group.calendar.google.com: INCLUDED (shared university calendar)
      expect(mockFreebusyQuery).toHaveBeenCalledWith({
        requestBody: {
          timeMin: startDate.toISOString(),
          timeMax: endDate.toISOString(),
          items: [
            { id: 'primary' },
            { id: 'university-course@group.calendar.google.com' },
          ],
        },
      });

      // Verify flattened busy slots returned (primary: 2 slots, university: 1 slot)
      expect(busySlots).toHaveLength(3);
      expect(busySlots[0]).toEqual({
        start: '2026-07-16T09:00:00Z',
        end: '2026-07-16T11:00:00Z',
      });
    });
  });
});
