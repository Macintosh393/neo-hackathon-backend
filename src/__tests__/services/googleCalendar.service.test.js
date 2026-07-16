const { mockCalendarList, mockFreebusyQuery } = require('../mocks/googleCalendar.mock');
const prisma = require('../../prisma');
const calendarService = require('../../services/googleCalendar.service');

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
    it('getBusySlots - should retrieve user tokens, fetch active calendars, filter generic ones, and query freebusy schedule', async () => {
      // Mock user in database with refresh token
      prisma.user.findUnique.mockResolvedValue({
        id: 'user-123',
        googleRefreshToken: 'refresh-token-abc'
      });

      const startDate = new Date('2026-07-16T00:00:00Z');
      const endDate = new Date('2026-07-16T23:59:59Z');

      const busySlots = await calendarService.getBusySlots('user-123', startDate, endDate);

      // Verify db retrieval
      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: 'user-123' }
      });

      // Verify calendars listed and holidays excluded
      expect(mockCalendarList).toHaveBeenCalled();
      
      // Verify freebusy query called with non-holiday calendar IDs
      expect(mockFreebusyQuery).toHaveBeenCalledWith({
        requestBody: {
          timeMin: startDate.toISOString(),
          timeMax: endDate.toISOString(),
          items: [
            { id: 'primary' },
            { id: 'university-course@group.calendar.google.com' }
          ]
        }
      });

      // Verify flattened busy slots returned
      expect(busySlots).toHaveLength(3);
      expect(busySlots[0]).toEqual({
        start: '2026-07-16T09:00:00Z',
        end: '2026-07-16T11:00:00Z'
      });
    });
  });
});
