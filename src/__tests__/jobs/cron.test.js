/**
 * Nightly Rescheduling Autopilot Cron Job Tests
 *
 * Uses vi.mock() to intercept googleapis and the calendar service module
 * at the Vitest level — no __tests__/mocks/ imports in production code.
 */

import { vi, describe, it, expect, beforeEach } from 'vitest';

// Mock googleapis so googleCalendar.service can be imported cleanly
vi.mock('googleapis', () => ({
  google: {
    calendar: () => ({
      calendarList: { list: vi.fn().mockResolvedValue({ data: { items: [] } }) },
      freebusy: { query: vi.fn().mockResolvedValue({ data: { calendars: {} } }) },
    }),
    auth: {
      OAuth2: class OAuth2 {
        constructor() {
          this.setCredentials = vi.fn();
          this.generateAuthUrl = vi.fn().mockReturnValue('https://mock');
          this.getToken = vi.fn().mockResolvedValue({ tokens: { refresh_token: 'r' } });
        }
      },
    },
  },
}));

// Mock clearEvents and createEvents on the calendar service module
vi.mock('../../services/googleCalendar.service.js', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    default: {
      ...actual.default,
      clearEvents: vi.fn().mockResolvedValue({}),
      createEvents: vi.fn().mockResolvedValue({}),
    },
  };
});

import prisma from '../../prisma.js';
import calendarService from '../../services/googleCalendar.service.js';
import { rescheduleUserSessions } from '../../jobs/cron.js';

describe('Nightly Rescheduling Autopilot Job', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('rescheduleUserSessions - should mark past scheduled sessions as MISSED, delete future scheduled ones, and run Greedy Scheduler to push them forward', async () => {
    // 1. Arrange mock user
    prisma.user.findUnique.mockResolvedValue({
      id: 'usr-1',
      googleRefreshToken: 'refresh-token-abc',
      persona: {
        courseYear: 3,
        preferredTime: 'evening',
        studyOnWeekends: false,
        maxHoursPerDay: 4,
      },
    });

    // Mock past scheduled session (2 hours ago)
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);
    const mockPastSession = {
      id: 'sess-past',
      projectId: 'proj-1',
      title: 'gRPC Requirements',
      durationMinutes: 60,
      startTime: twoHoursAgo.toISOString(),
      endTime: new Date(twoHoursAgo.getTime() + 60 * 60 * 1000).toISOString(),
      status: 'SCHEDULED',
    };

    // Mock future scheduled session (4 hours later)
    const fourHoursLater = new Date(Date.now() + 4 * 60 * 60 * 1000);
    const mockFutureSession = {
      id: 'sess-future',
      projectId: 'proj-1',
      title: 'gRPC Coding',
      durationMinutes: 90,
      startTime: fourHoursLater.toISOString(),
      endTime: new Date(fourHoursLater.getTime() + 90 * 60 * 1000).toISOString(),
      status: 'SCHEDULED',
    };

    // Mock projects query returning the project containing the sessions
    prisma.project.findMany.mockResolvedValue([
      {
        id: 'proj-1',
        title: 'gRPC Coursework',
        deadline: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
        sessions: [mockPastSession, mockFutureSession],
      },
    ]);

    // Mock studySession queries inside the loop
    prisma.studySession.findMany.mockResolvedValue([
      { id: 'sess-new-1', projectId: 'proj-1', title: 'gRPC Requirements', durationMinutes: 60 },
      { id: 'sess-new-2', projectId: 'proj-1', title: 'gRPC Coding', durationMinutes: 90 },
    ]);

    prisma.$transaction.mockResolvedValue([]);

    // 2. Act
    const count = await rescheduleUserSessions('usr-1');

    // 3. Assert
    expect(count).toBeGreaterThan(0);

    // Verify past session updated to MISSED
    expect(prisma.studySession.update).toHaveBeenCalledWith({
      where: { id: 'sess-past' },
      data: { status: 'MISSED' },
    });

    // Verify future scheduled sessions deleted
    expect(prisma.studySession.delete).toHaveBeenCalledWith({
      where: { id: 'sess-future' },
    });

    // Verify new study sessions created
    expect(prisma.studySession.createMany).toHaveBeenCalled();

    // Verify calendar events cleared and re-created
    expect(calendarService.clearEvents).toHaveBeenCalledWith('usr-1', expect.any(Date), expect.any(Date));
    expect(calendarService.createEvents).toHaveBeenCalled();
  });
});
