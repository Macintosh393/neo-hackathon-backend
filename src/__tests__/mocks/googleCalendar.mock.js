const mockCalendarList = vi.fn().mockResolvedValue({
  data: {
    items: [
      { id: 'primary', summary: 'Primary Calendar', accessRole: 'owner' },
      { id: 'holiday@group.v.calendar.google.com', summary: 'Holidays', accessRole: 'reader' },
      { id: 'university-course@group.calendar.google.com', summary: 'Uni Schedule', accessRole: 'writer' }
    ]
  }
});

const mockFreebusyQuery = vi.fn().mockResolvedValue({
  data: {
    calendars: {
      primary: {
        busy: [
          { start: '2026-07-16T09:00:00Z', end: '2026-07-16T11:00:00Z' },
          { start: '2026-07-16T14:00:00Z', end: '2026-07-16T16:00:00Z' }
        ]
      },
      'university-course@group.calendar.google.com': {
        busy: [
          { start: '2026-07-16T12:00:00Z', end: '2026-07-16T13:00:00Z' }
        ]
      }
    }
  }
});

const mockGoogleApis = {
  google: {
    calendar: () => ({
      calendarList: {
        list: mockCalendarList
      },
      freebusy: {
        query: mockFreebusyQuery
      }
    }),
    auth: {
      OAuth2: class OAuth2 {
        constructor() {
          this.setCredentials = vi.fn();
          this.generateAuthUrl = vi.fn().mockImplementation((config) => {
            const accessType = config?.access_type || '';
            const prompt = config?.prompt || '';
            return `https://mock-google-auth-url?access_type=${accessType}&prompt=${prompt}`;
          });
          this.getToken = vi.fn().mockResolvedValue({
            tokens: {
              access_token: 'mock-access-token',
              refresh_token: 'mock-refresh-token',
              expiry_date: Date.now() + 3600000
            }
          });
        }
      }
    }
  }
};

module.exports = {
  mockGoogleApis,
  mockCalendarList,
  mockFreebusyQuery
};
