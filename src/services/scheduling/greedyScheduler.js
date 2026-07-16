const { addDays, addMinutes, differenceInMinutes, isAfter, isBefore, isSameDay, set, getDay } = require('date-fns');

/**
 * pure Greedy Scheduler algorithm.
 * Planners AI-generated sessions into available calendar gaps.
 * Uses 4 cascading passes to handle constraints degradation gracefully.
 * 
 * @param {Object} params
 * @param {Array<Object>} params.aiSessions - AI decomposed tasks [{title, durationMinutes}]
 * @param {Object} params.persona - Preferred time, day limits, weekend flags
 * @param {Array<Object>} params.busySlots - Flattened busy ranges [{start, end}]
 * @param {Date|string} params.projectDeadline - Target project deadline Date
 * @param {Date|string} params.startDate - Scheduling search start Date
 * @returns {Array<Object>} List of scheduled sessions with dates and compromise metadata
 */
function greedyScheduler({ aiSessions, persona, busySlots, projectDeadline, startDate }) {
  const deadline = new Date(projectDeadline);
  const start = new Date(startDate);
  
  const busy = busySlots.map(s => ({
    start: new Date(s.start),
    end: new Date(s.end)
  }));
  
  const timeBounds = {
    morning: { startHour: 8, endHour: 12 },
    afternoon: { startHour: 12, endHour: 17 },
    evening: { startHour: 17, endHour: 22 },
    fullDay: { startHour: 8, endHour: 22 }
  };
  
  // Loop through 4 fallback levels
  for (let pass = 1; pass <= 4; pass++) {
    const result = runSchedulingPass({
      aiSessions,
      persona,
      busy,
      deadline,
      start,
      pass,
      timeBounds
    });
    
    if (result !== null) {
      return result;
    }
  }
  
  return [];
}

/**
 * Runs a single scheduling attempt with a specific pass configuration constraint levels.
 */
function runSchedulingPass({ aiSessions, persona, busy, deadline, start, pass, timeBounds }) {
  let queue = aiSessions.map((s, idx) => ({
    title: s.title,
    durationMinutes: s.durationMinutes,
    originalIndex: idx
  }));
  
  const scheduled = [];
  let currentDate = new Date(start);
  const dailyStudyTime = {};
  
  const preferred = persona.preferredTime;
  const preferredBounds = timeBounds[preferred] || timeBounds.evening;
  
  const maxSearchDays = 365;
  let dayCount = 0;
  
  while (queue.length > 0 && dayCount < maxSearchDays) {
    dayCount++;
    
    const dayOfWeek = getDay(currentDate);
    const isWeekend = (dayOfWeek === 0 || dayOfWeek === 6);
    
    const allowWeekends = (pass >= 3 || persona.studyOnWeekends);
    if (isWeekend && !allowWeekends) {
      currentDate = addDays(currentDate, 1);
      continue;
    }
    
    // Check if currentDate has exceeded deadline. In passes 1-3, this is a failure.
    if (pass < 4 && isAfter(set(currentDate, { hours: 8, minutes: 0, seconds: 0, milliseconds: 0 }), deadline)) {
      return null;
    }
    
    let startHour = preferredBounds.startHour;
    let endHour = preferredBounds.endHour;
    
    if (pass >= 2) {
      startHour = timeBounds.fullDay.startHour;
      endHour = timeBounds.fullDay.endHour;
    }
    
    const dayStart = set(currentDate, { hours: startHour, minutes: 0, seconds: 0, milliseconds: 0 });
    const dayEnd = set(currentDate, { hours: endHour, minutes: 0, seconds: 0, milliseconds: 0 });
    
    let windowStart = isSameDay(currentDate, start) && isAfter(start, dayStart) ? start : dayStart;
    const windowEnd = dayEnd;
    
    if (isAfter(windowStart, windowEnd)) {
      currentDate = addDays(currentDate, 1);
      continue;
    }
    
    const dateKey = windowStart.toISOString().split('T')[0];
    if (!dailyStudyTime[dateKey]) {
      dailyStudyTime[dateKey] = 0;
    }
    
    const maxStudyMinutes = persona.maxHoursPerDay * 60;
    
    // Subtract busy slots
    let freeWindows = [{ start: windowStart, end: windowEnd }];
    const todaysBusy = busy.filter(b => isBefore(b.start, windowEnd) && isAfter(b.end, windowStart));
    
    for (const b of todaysBusy) {
      const nextFree = [];
      for (const f of freeWindows) {
        if (isBefore(b.start, f.end) && isAfter(b.end, f.start)) {
          if (isBefore(f.start, b.start)) {
            nextFree.push({ start: f.start, end: b.start });
          }
          if (isAfter(f.end, b.end)) {
            nextFree.push({ start: b.end, end: f.end });
          }
        } else {
          nextFree.push(f);
        }
      }
      freeWindows = nextFree;
    }
    
    freeWindows = freeWindows.filter(f => differenceInMinutes(f.end, f.start) >= 5);
    
    if (freeWindows.length === 0) {
      currentDate = addDays(currentDate, 1);
      continue;
    }
    
    for (let i = 0; i < freeWindows.length; i++) {
      const f = freeWindows[i];
      let windowDuration = differenceInMinutes(f.end, f.start);
      
      while (queue.length > 0 && windowDuration >= 5) {
        const session = queue[0];
        const remainingStudyMinutes = maxStudyMinutes - dailyStudyTime[dateKey];
        const maxAllocatable = Math.min(windowDuration, remainingStudyMinutes);
        
        if (maxAllocatable <= 0) {
          break; // Exceeded daily hours limit
        }
        
        if (session.durationMinutes <= maxAllocatable) {
          const sessStart = f.start;
          const sessEnd = addMinutes(sessStart, session.durationMinutes);
          
          if (pass < 4 && isAfter(sessEnd, deadline)) {
            return null; // Exceeds deadline
          }
          
          let isCompromised = false;
          let compromiseReason = null;
          
          if (pass === 2) {
            isCompromised = true;
            compromiseReason = 'Scheduled outside preferred time';
          } else if (pass === 3) {
            isCompromised = true;
            compromiseReason = 'Scheduled on weekend to meet deadline';
          } else if (pass === 4) {
            isCompromised = true;
            compromiseReason = 'Deadline violated due to lack of free time';
          }
          
          scheduled.push({
            title: session.title,
            durationMinutes: session.durationMinutes,
            startTime: sessStart.toISOString(),
            endTime: sessEnd.toISOString(),
            isCompromised,
            compromiseReason
          });
          
          dailyStudyTime[dateKey] += session.durationMinutes;
          queue.shift();
          
          f.start = sessEnd;
          windowDuration = differenceInMinutes(f.end, f.start);
        } else {
          // Session is too large for remaining study time or window segment. Can we split?
          if (maxAllocatable >= 30) {
            const splitDuration = maxAllocatable;
            const sessStart = f.start;
            const sessEnd = addMinutes(sessStart, splitDuration);
            
            if (pass < 4 && isAfter(sessEnd, deadline)) {
              return null; // Exceeds deadline
            }
            
            let isCompromised = false;
            let compromiseReason = null;
            
            if (pass === 2) {
              isCompromised = true;
              compromiseReason = 'Scheduled outside preferred time';
            } else if (pass === 3) {
              isCompromised = true;
              compromiseReason = 'Scheduled on weekend to meet deadline';
            } else if (pass === 4) {
              isCompromised = true;
              compromiseReason = 'Deadline violated due to lack of free time';
            }
            
            const originalTitle = session.title;
            
            scheduled.push({
              title: `${originalTitle} (Частина 1)`,
              durationMinutes: splitDuration,
              startTime: sessStart.toISOString(),
              endTime: sessEnd.toISOString(),
              isCompromised,
              compromiseReason
            });
            
            dailyStudyTime[dateKey] += splitDuration;
            queue.shift();
            queue.unshift({
              title: `${originalTitle} (Частина 2)`,
              durationMinutes: session.durationMinutes - splitDuration,
              originalIndex: session.originalIndex
            });
            
            f.start = sessEnd;
            windowDuration = differenceInMinutes(f.end, f.start);
          } else {
            break;
          }
        }
      }
    }
    
    currentDate = addDays(currentDate, 1);
  }
  
  if (queue.length === 0) {
    return scheduled;
  }
  
  return null;
}

module.exports = greedyScheduler;
