import greedyScheduler from '../../services/scheduling/greedyScheduler.js';

describe('Greedy Scheduler Algorithm Tests', () => {
  // Common inputs using local dates to avoid timezone discrepancies
  const startDate = new Date(2026, 6, 20, 0, 0, 0); // Monday, July 20, 2026
  const deadlineDate = new Date(2026, 6, 24, 23, 59, 59); // Friday, July 24, 2026

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
    
    const start = new Date(session.startTime);
    const end = new Date(session.endTime);
    
    expect(start.getHours()).toBe(17);
    expect(start.getMinutes()).toBe(0);
    expect(end.getHours()).toBe(19);
    expect(end.getMinutes()).toBe(0);
  });

  it('should skip busy slots in calendar', () => {
    const aiSessions = [{ title: 'Database Design', durationMinutes: 120 }];
    const busySlots = [
      {
        start: new Date(2026, 6, 20, 17, 0, 0),
        end: new Date(2026, 6, 20, 18, 30, 0)
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

    expect(start.getTime()).toBe(new Date(2026, 6, 20, 18, 30, 0).getTime());
    expect(end.getTime()).toBe(new Date(2026, 6, 20, 20, 30, 0).getTime());
    expect(session.isCompromised).toBe(false);
  });

  it('should enforce maxHoursPerDay limit by pushing subsequent sessions to next day', () => {
    const aiSessions = [
      { title: 'Task 1', durationMinutes: 120 },
      { title: 'Task 2', durationMinutes: 120 },
      { title: 'Task 3', durationMinutes: 120 }
    ];
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

    expect(t1Start.getDate()).toBe(20); // Monday
    expect(t2Start.getDate()).toBe(20); // Monday
    expect(t3Start.getDate()).toBe(21); // Tuesday
  });

  it('should skip weekends if studyOnWeekends is false', () => {
    const aiSessions = [
      { title: 'Task 1', durationMinutes: 220 },
      { title: 'Task 2', durationMinutes: 120 }
    ];
    const friStart = new Date(2026, 6, 24, 0, 0, 0); // Friday, July 24
    const extendedDeadline = new Date(2026, 6, 28, 23, 59, 59);

    const result = greedyScheduler({
      aiSessions,
      persona: personaDefault,
      busySlots: [],
      projectDeadline: extendedDeadline,
      startDate: friStart
    });

    expect(result).toHaveLength(2);
    expect(new Date(result[0].startTime).getDate()).toBe(24); // Friday
    expect(new Date(result[1].startTime).getDate()).toBe(27); // Monday
  });

  it('should fallback to Pass 2 (fullDay) if preferredTime is completely blocked', () => {
    const aiSessions = [{ title: 'Blocked Evening Task', durationMinutes: 120 }];
    const mondayDeadline = new Date(2026, 6, 20, 23, 59, 59);
    const busySlots = [
      {
        start: new Date(2026, 6, 20, 17, 0, 0),
        end: new Date(2026, 6, 20, 22, 0, 0)
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
    expect(start.getHours()).toBe(8);
  });

  it('should fallback to Pass 3 (weekends) if it cannot fit on weekdays', () => {
    const aiSessions = [{ title: 'Weekend Fallback Task', durationMinutes: 120 }];
    const friStart = new Date(2026, 6, 24, 0, 0, 0); // Friday, July 24
    const sunDeadline = new Date(2026, 6, 26, 23, 59, 59); // Sunday, July 26
    
    const busySlots = [
      {
        start: new Date(2026, 6, 24, 8, 0, 0),
        end: new Date(2026, 6, 24, 22, 0, 0)
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
    expect(new Date(session.startTime).getDate()).toBe(25); // Saturday
  });

  it('should fallback to Pass 4 (deadline violation) if it mathematically cannot fit before deadline', () => {
    const aiSessions = [{ title: 'Late Task', durationMinutes: 120 }];
    const monStart = new Date(2026, 6, 20, 0, 0, 0);
    const tueDeadline = new Date(2026, 6, 21, 9, 0, 0);
    
    const busySlots = [
      {
        start: new Date(2026, 6, 20, 8, 0, 0),
        end: new Date(2026, 6, 20, 22, 0, 0)
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
    expect(start.getDate()).toBe(21);
    expect(start.getHours()).toBe(8);
  });

  it('should split a session if it cannot fit in any single free window', () => {
    const aiSessions = [{ title: 'Giant Task', durationMinutes: 120 }];
    const busySlots = [
      {
        start: new Date(2026, 6, 20, 18, 30, 0),
        end: new Date(2026, 6, 20, 20, 30, 0)
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
    expect(new Date(result[0].startTime).getTime()).toBe(new Date(2026, 6, 20, 17, 0, 0).getTime());
    expect(new Date(result[0].endTime).getTime()).toBe(new Date(2026, 6, 20, 18, 30, 0).getTime());

    expect(result[1].title).toBe('Giant Task (Частина 2)');
    expect(result[1].durationMinutes).toBe(30);
    expect(new Date(result[1].startTime).getTime()).toBe(new Date(2026, 6, 20, 20, 30, 0).getTime());
    expect(new Date(result[1].endTime).getTime()).toBe(new Date(2026, 6, 20, 21, 0, 0).getTime());
  });

});
