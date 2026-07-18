import {
  addDays,
  addMinutes,
  differenceInMinutes,
  isAfter,
  isBefore,
  isSameDay,
  getDay,
} from 'date-fns';
import { toZonedTime, fromZonedTime } from 'date-fns-tz';

/**
 * Pure Greedy Scheduler — ALGORITHM.md compliant implementation.
 *
 * Takes AI-generated sessions (title + durationMinutes, no dates) and places
 * them into the user's real-world timeline without overlapping busy slots,
 * while respecting persona constraints.
 *
 * Timezone handling (ALGORITHM.md §6.3):
 *   - Busy slots and output startTime/endTime are UTC ISO 8601 strings.
 *   - Daily boundary math (08:00, 22:00, etc.) is performed in the USER's
 *     local timezone using `date-fns-tz` toZonedTime / fromZonedTime.
 *   - Falls back to "Europe/Kyiv" if no timezone is provided.
 *
 * @param {Object} params
 * @param {Array<{title: string, durationMinutes: number}>} params.aiSessions
 * @param {{ preferredTime: string, maxHoursPerDay: number, studyOnWeekends: boolean }} params.persona
 * @param {Array<{start: string|Date, end: string|Date}>} params.busySlots
 * @param {Date|string} params.projectDeadline
 * @param {Date|string} params.startDate
 * @param {string} [params.timezone="Europe/Kyiv"] - IANA timezone identifier
 * @returns {Array<{title, startTime, endTime, durationMinutes, isCompromised, compromiseReason}>}
 */
function greedyScheduler({ aiSessions, persona, busySlots, projectDeadline, startDate, timezone = 'Europe/Kyiv' }) {
  const deadline = new Date(projectDeadline);
  const start = new Date(startDate);

  const busy = busySlots.map((s) => ({
    start: new Date(s.start),
    end: new Date(s.end),
  }));

  /** Time bounds in local hours. Never schedule between 22:00 and 08:00. */
  const TIME_BOUNDS = {
    morning:   { startHour: 8,  endHour: 12 },
    afternoon: { startHour: 12, endHour: 17 },
    evening:   { startHour: 17, endHour: 22 },
    fullDay:   { startHour: 8,  endHour: 22 },
  };

  // Run passes 1–4 until one succeeds
  for (let pass = 1; pass <= 4; pass++) {
    const result = runSchedulingPass({
      aiSessions,
      persona,
      busy,
      deadline,
      start,
      pass,
      timeBounds: TIME_BOUNDS,
      timezone,
    });
    if (result !== null) return result;
  }

  return [];
}

/**
 * Runs a single scheduling attempt with a given constraint level (pass 1–4).
 * Returns null if it cannot schedule all sessions within the deadline.
 */
function runSchedulingPass({ aiSessions, persona, busy, deadline, start, pass, timeBounds, timezone }) {
  let queue = aiSessions.map((s, idx) => ({
    title: s.title,
    durationMinutes: s.durationMinutes,
    originalIndex: idx,
  }));

  const scheduled = [];
  let currentDate = new Date(start);

  /** Per-day study minutes tracker: { 'YYYY-MM-DD': minutesAllocated } */
  const dailyStudyTime = {};

  const preferred = persona.preferredTime;
  const preferredBounds = timeBounds[preferred] || timeBounds.evening;
  const maxStudyMinutes = (persona.maxHoursPerDay || 4) * 60;

  const MAX_SEARCH_DAYS = 365;
  let dayCount = 0;

  while (queue.length > 0 && dayCount < MAX_SEARCH_DAYS) {
    dayCount++;

    // ── Weekend gate ─────────────────────────────────────────────────────────
    const dayOfWeek = getDay(currentDate);
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    const allowWeekends = pass >= 3 || persona.studyOnWeekends;
    if (isWeekend && !allowWeekends) {
      currentDate = addDays(currentDate, 1);
      continue;
    }

    // ── Deadline gate (passes 1–3 must not cross deadline) ───────────────────
    // Compare against start-of-day in user's timezone
    const localCurrentDay = toZonedTime(currentDate, timezone);
    const localCurrentDayStart = fromZonedTime(
      new Date(
        localCurrentDay.getFullYear(),
        localCurrentDay.getMonth(),
        localCurrentDay.getDate(),
        8, 0, 0, 0,
      ),
      timezone,
    );
    if (pass < 4 && isAfter(localCurrentDayStart, deadline)) {
      return null;
    }

    // ── Compute day window in user's local timezone ───────────────────────────
    const startHour = pass >= 2 ? timeBounds.fullDay.startHour : preferredBounds.startHour;
    const endHour   = pass >= 2 ? timeBounds.fullDay.endHour   : preferredBounds.endHour;

    // Build UTC timestamps for this day's boundary in the user's timezone
    const localDay = toZonedTime(currentDate, timezone);
    const dayStartUtc = fromZonedTime(
      new Date(localDay.getFullYear(), localDay.getMonth(), localDay.getDate(), startHour, 0, 0, 0),
      timezone,
    );
    const dayEndUtc = fromZonedTime(
      new Date(localDay.getFullYear(), localDay.getMonth(), localDay.getDate(), endHour, 0, 0, 0),
      timezone,
    );

    // If we're on the startDate itself, clamp the window start to "now"
    const windowStart = isSameDay(currentDate, start) && isAfter(start, dayStartUtc)
      ? start
      : dayStartUtc;
    const windowEnd = dayEndUtc;

    if (!isBefore(windowStart, windowEnd)) {
      currentDate = addDays(currentDate, 1);
      continue;
    }

    // ── Per-day study-time budget ─────────────────────────────────────────────
    // Use UTC date string as key (consistent — one day per iteration)
    const dateKey = dayStartUtc.toISOString().split('T')[0];
    if (!dailyStudyTime[dateKey]) dailyStudyTime[dateKey] = 0;

    // ── Subtract busy slots from the available window ─────────────────────────
    let freeWindows = [{ start: windowStart, end: windowEnd }];
    const todaysBusy = busy.filter(
      (b) => isBefore(b.start, windowEnd) && isAfter(b.end, windowStart),
    );

    for (const b of todaysBusy) {
      const nextFree = [];
      for (const f of freeWindows) {
        if (isBefore(b.start, f.end) && isAfter(b.end, f.start)) {
          if (isBefore(f.start, b.start)) nextFree.push({ start: f.start, end: b.start });
          if (isAfter(f.end, b.end))     nextFree.push({ start: b.end,   end: f.end   });
        } else {
          nextFree.push(f);
        }
      }
      freeWindows = nextFree;
    }

    // Discard tiny fragments (< 5 min)
    freeWindows = freeWindows.filter((f) => differenceInMinutes(f.end, f.start) >= 5);

    if (freeWindows.length === 0) {
      currentDate = addDays(currentDate, 1);
      continue;
    }

    // ── Try to place sessions into free windows ───────────────────────────────
    for (const f of freeWindows) {
      let windowDuration = differenceInMinutes(f.end, f.start);

      while (queue.length > 0 && windowDuration >= 5) {
        const session = queue[0];
        const remainingBudget = maxStudyMinutes - dailyStudyTime[dateKey];
        const maxAllocatable = Math.min(windowDuration, remainingBudget);

        if (maxAllocatable <= 0) break; // Day's study limit reached

        if (session.durationMinutes <= maxAllocatable) {
          // ── Full session fits ─────────────────────────────────────────────
          const sessStart = new Date(f.start);
          const sessEnd   = addMinutes(sessStart, session.durationMinutes);

          if (pass < 4 && isAfter(sessEnd, deadline)) return null;

          scheduled.push(buildScheduled(session.title, session.durationMinutes, sessStart, sessEnd, pass));
          dailyStudyTime[dateKey] += session.durationMinutes;
          queue.shift();

          f.start = sessEnd;
          windowDuration = differenceInMinutes(f.end, f.start);
        } else if (maxAllocatable >= 30) {
          // ── Split: minimum chunk is 30 minutes ───────────────────────────
          // ALGORITHM.md §6.1: split large sessions when the window is too small
          const splitDuration = maxAllocatable;
          const sessStart = new Date(f.start);
          const sessEnd   = addMinutes(sessStart, splitDuration);

          if (pass < 4 && isAfter(sessEnd, deadline)) return null;

          const originalTitle = session.title;
          scheduled.push(buildScheduled(`${originalTitle} (Частина 1)`, splitDuration, sessStart, sessEnd, pass));
          dailyStudyTime[dateKey] += splitDuration;

          // Replace queue head with the remainder
          queue.shift();
          queue.unshift({
            title: `${originalTitle} (Частина 2)`,
            durationMinutes: session.durationMinutes - splitDuration,
            originalIndex: session.originalIndex,
          });

          f.start = sessEnd;
          windowDuration = differenceInMinutes(f.end, f.start);
        } else {
          break; // Remaining slot too small to split further
        }
      }
    }

    currentDate = addDays(currentDate, 1);
  }

  return queue.length === 0 ? scheduled : null;
}

/**
 * Builds a scheduled session object with compromise metadata.
 *
 * @param {string} title
 * @param {number} durationMinutes
 * @param {Date}   startTime
 * @param {Date}   endTime
 * @param {number} pass - 1–4
 * @returns {object}
 */
function buildScheduled(title, durationMinutes, startTime, endTime, pass) {
  const compromiseMap = {
    2: 'Scheduled outside preferred time',
    3: 'Scheduled on weekend to meet deadline',
    4: 'Deadline violated due to lack of free time',
  };
  const isCompromised = pass > 1;
  return {
    title,
    durationMinutes,
    startTime: startTime.toISOString(),
    endTime:   endTime.toISOString(),
    isCompromised,
    compromiseReason: isCompromised ? compromiseMap[pass] : null,
  };
}

export default greedyScheduler;
