/**
 * Vitest Global Setup File
 *
 * Registered as globalSetup in vitest.config.js. Runs once before all test
 * suites. Provides a global vi.mock() for the googleapis module so that
 * no test can accidentally hit the real Google API.
 *
 * Individual test files can override specific mock return values with
 * mockResolvedValue / mockImplementation inside their own beforeEach hooks.
 */

import { vi } from 'vitest';

vi.mock('googleapis', () => ({
  google: {
    calendar: () => ({
      calendarList: {
        list: vi.fn().mockResolvedValue({ data: { items: [] } }),
      },
      freebusy: {
        query: vi.fn().mockResolvedValue({ data: { calendars: {} } }),
      },
      events: {
        insert: vi.fn().mockResolvedValue({}),
        list: vi.fn().mockResolvedValue({ data: { items: [] } }),
        delete: vi.fn().mockResolvedValue({}),
      },
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
              id_token: btoa(JSON.stringify({ header: {} })) + '.' +
                btoa(JSON.stringify({ email: 'mockstudent@university.edu' })) + '.signature',
              expiry_date: Date.now() + 3600000,
            },
          });
        }
      },
    },
  },
}));
