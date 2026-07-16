process.env.TZ = 'UTC';
const greedyScheduler = require('../../services/scheduling/greedyScheduler');

describe('Greedy Scheduler Algorithm Tests', () => {
  // Common inputs
  const startDate = new Date('2026-07-20T00:00:00.000Z'); // Monday
  const deadlineDate = new Date('2026-07-24T23:59:59.000Z'); // Friday

  const personaDefault = {
    preferredTime: 'evening', // 17:00 - 22:00
    maxHoursPerDay: 4,
    studyOnWeekends: false
  };

  it('should schedule a session strictly in preferredTime evening window', () => {
    const aiSessions = [{ title: 'Database Design', durationMinutes: 120 }];
    const busySlots = []; // No busy slots

    const result = greedyScheduler({
      aiSessions,
      persona: personaDefault,
      busySlots,
      projectDeadline: deadlineDate,
      startDate
    });

    expect(result).toHaveLength(1);
    const session = result[0];
    expect(session.title).toBe('Database Design');
    expect(session.durationMinutes).toBe(120);
    expect(session.isCompromised).toBe(false);
    
    // Check evening bounds: 17:00 UTC (assuming Z for dates in tests)
    const start = new Date(session.startTime);
    const end = new Date(session.endTime);
    
    expect(start.getUTCHours()).toBe(17);
    expect(start.getUTCMinutes()).toBe(0);
    expect(end.getUTCHours()).toBe(19);
    expect(end.getUTCMinutes()).toBe(0);
  });

  it('should skip busy slots in calendar', () => {
    const aiSessions = [{ title: 'Database Design', durationMinutes: 120 }];
    // Busy slot overlaps with evening start: 17:00 - 18:30
    const busySlots = [
      {
        start: new Date('2026-07-20T17:00:00.000Z'),
        end: new Date('2026-07-20T18:30:00.000Z')
      }
    ];

    const result = greedyScheduler({
      aiSessions,
      persona: personaDefault,
      busySlots,
      projectDeadline: deadlineDate,
      startDate
    });

    expect(result).toHaveLength(1);
    const session = result[0];
    const start = new Date(session.startTime);
    const end = new Date(session.endTime);

    // Should place session from 18:30 to 20:30
    expect(start.toISOString()).toBe('2026-07-20T18:30:00.000Z');
    expect(end.toISOString()).toBe('2026-07-20T20:30:00.000Z');
    expect(session.isCompromised).toBe(false);
  });

  it('should enforce maxHoursPerDay limit by pushing subsequent sessions to next day', () => {
    const aiSessions = [
      { title: 'Task 1', durationMinutes: 120 },
      { title: 'Task 2', durationMinutes: 120 },
      { title: 'Task 3', durationMinutes: 120 }
    ];
    // maxHoursPerDay is 4 (240 mins). Task 1 + Task 2 = 240 mins.
    // Task 3 should be pushed to next day (Tuesday, July 21st).
    const result = greedyScheduler({
      aiSessions,
      persona: personaDefault,
      busySlots: [],
      projectDeadline: deadlineDate,
      startDate
    });

    expect(result).toHaveLength(3);
    
    const t1Start = new Date(result[0].startTime);
    const t2Start = new Date(result[1].startTime);
    const t3Start = new Date(result[2].startTime);

    expect(t1Start.getUTCDate()).toBe(20); // Monday
    expect(t2Start.getUTCDate()).toBe(20); // Monday
    expect(t3Start.getUTCDate()).toBe(21); // Tuesday
  });

  it('should skip weekends if studyOnWeekends is false', () => {
    const aiSessions = [
      { title: 'Task 1', durationMinutes: 220 },
      { title: 'Task 2', durationMinutes: 120 }
    ];
    // Friday start: July 24th is Friday. Next day is Saturday.
    // Task 2 should skip Sat/Sun and schedule on Monday (July 27th)
    const friStart = new Date('2026-07-24T00:00:00.000Z');
    const extendedDeadline = new Date('2026-07-28T23:59:59.000Z');

    const result = greedyScheduler({
      aiSessions,
      persona: personaDefault,
      busySlots: [],
      projectDeadline: extendedDeadline,
      startDate: friStart
    });

    expect(result).toHaveLength(2);
    expect(new Date(result[0].startTime).getUTCDate()).toBe(24); // Friday
    expect(new Date(result[1].startTime).getUTCDate()).toBe(27); // Monday
  });

  it('should fallback to Pass 2 (fullDay) if preferredTime is completely blocked', () => {
    const aiSessions = [{ title: 'Blocked Evening Task', durationMinutes: 120 }];
    // Block evening entirely on Monday: 17:00 - 22:00
    // Deadline is Monday night, so it has to schedule Monday or fail.
    const mondayDeadline = new Date('2026-07-20T23:59:59.000Z');
    const busySlots = [
      {
        start: new Date('2026-07-20T17:00:00.000Z'),
        end: new Date('2026-07-20T22:00:00.000Z')
      }
    ];

    const result = greedyScheduler({
      aiSessions,
      persona: personaDefault,
      busySlots,
      projectDeadline: mondayDeadline,
      startDate
    });

    expect(result).toHaveLength(1);
    const session = result[0];
    expect(session.isCompromised).toBe(true);
    expect(session.compromiseReason).toBe('Scheduled outside preferred time');
    
    const start = new Date(session.startTime);
    // Should schedule earlier on Monday (since preferredTime evening is blocked, fullDay is 08:00 - 22:00)
    // Earliest fullDay slot: 08:00
    expect(start.getUTCHours()).toBe(8);
  });

  it('should fallback to Pass 3 (weekends) if it cannot fit on weekdays', () => {
    const aiSessions = [{ title: 'Weekend Fallback Task', durationMinutes: 120 }];
    // Start on Friday, deadline on Sunday.
    // Friday is completely busy (08:00 - 22:00)
    const friStart = new Date('2026-07-24T00:00:00.000Z'); // Friday
    const sunDeadline = new Date('2026-07-26T23:59:59.000Z'); // Sunday
    
    const busySlots = [
      {
        start: new Date('2026-07-24T08:00:00.000Z'),
        end: new Date('2026-07-24T22:00:00.000Z')
      }
    ];

    const result = greedyScheduler({
      aiSessions,
      persona: personaDefault, // studyOnWeekends: false
      busySlots,
      projectDeadline: sunDeadline,
      startDate: friStart
    });

    expect(result).toHaveLength(1);
    const session = result[0];
    expect(session.isCompromised).toBe(true);
    expect(session.compromiseReason).toBe('Scheduled on weekend to meet deadline');
    expect(new Date(session.startTime).getUTCDate()).toBe(25); // Saturday
  });

  it('should fallback to Pass 4 (deadline violation) if it mathematically cannot fit before deadline', () => {
    const aiSessions = [{ title: 'Late Task', durationMinutes: 120 }];
    // Start on Monday, deadline is Tuesday morning (09:00).
    // Monday is completely blocked.
    // The task should be scheduled on Tuesday after the deadline (since it cannot fit before).
    const monStart = new Date('2026-07-20T00:00:00.000Z');
    const tueDeadline = new Date('2026-07-21T09:00:00.000Z');
    
    const busySlots = [
      {
        start: new Date('2026-07-20T08:00:00.000Z'),
        end: new Date('2026-07-20T22:00:00.000Z')
      }
    ];

    const result = greedyScheduler({
      aiSessions,
      persona: personaDefault,
      busySlots,
      projectDeadline: tueDeadline,
      startDate: monStart
    });

    expect(result).toHaveLength(1);
    const session = result[0];
    expect(session.isCompromised).toBe(true);
    expect(session.compromiseReason).toBe('Deadline violated due to lack of free time');
    
    const start = new Date(session.startTime);
    // Tuesday (July 21st) 08:00 onwards. Since 08:00 - 09:00 is only 60 mins and task is 120 mins,
    // it will schedule from 08:00 to 10:00, which extends past 09:00 deadline.
    expect(start.getUTCDate()).toBe(21);
    expect(start.getUTCHours()).toBe(8);
  });

  it('should split a session if it cannot fit in any single free window', () => {
    const aiSessions = [{ title: 'Giant Task', durationMinutes: 120 }];
    // Window on Monday: 17:00 - 22:00.
    // Busy slot splits it: 18:30 - 20:30 (leaving 17:00-18:30 [90m] and 20:30-22:00 [90m]).
    // The 120m task should be split into 90m (Part 1) and 30m (Part 2).
    const busySlots = [
      {
        start: new Date('2026-07-20T18:30:00.000Z'),
        end: new Date('2026-07-20T20:30:00.000Z')
      }
    ];

    const result = greedyScheduler({
      aiSessions,
      persona: personaDefault,
      busySlots,
      projectDeadline: deadlineDate,
      startDate
    });

    expect(result).toHaveLength(2);
    
    expect(result[0].title).toBe('Giant Task (Частина 1)');
    expect(result[0].durationMinutes).toBe(90);
    expect(new Date(result[0].startTime).toISOString()).toBe('2026-07-20T17:00:00.000Z');
    expect(new Date(result[0].endTime).toISOString()).toBe('2026-07-20T18:30:00.000Z');

    expect(result[1].title).toBe('Giant Task (Частина 2)');
    expect(result[1].durationMinutes).toBe(30);
    expect(new Date(result[1].startTime).toISOString()).toBe('2026-07-20T20:30:00.000Z');
    expect(new Date(result[1].endTime).toISOString()).toBe('2026-07-20T21:00:00.000Z');
  });

});
