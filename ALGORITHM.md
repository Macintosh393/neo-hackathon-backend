# Algorithmic Specification: The Greedy Scheduler (`ALGORITHM_SPEC.md`)

## 1. Overview
The `greedyScheduler` is a deterministic, mathematical pure function. Its sole responsibility is to take AI-generated study sessions (which have durations but no dates) and place them into the user's real-world timeline without overlapping with Google Calendar events, while respecting user persona constraints.

## 2. Inputs & Outputs
**Input Parameters:**
1. `aiSessions`: Array of objects `[{ title: string, durationMinutes: number }]`.
2. `persona`: Object `{ preferredTime: "morning" | "afternoon" | "evening", maxHoursPerDay: number, studyOnWeekends: boolean }`.
3. `busySlots`: Array of objects `[{ start: Date, end: Date }]` (flattened from all Google Calendars).
4. `projectDeadline`: Date.
5. `startDate`: Date (usually `Now`, or tomorrow if today's hours are exhausted).

**Output:**
Array of scheduled sessions: `[{ title, startTime, endTime, durationMinutes, isCompromised: boolean, compromiseReason?: string }]`.

## 3. Global Constants & Time Boundaries
The algorithm translates human-readable `preferredTime` into strict local time bounds:
- `morning`: 08:00 - 12:00
- `afternoon`: 12:00 - 17:00
- `evening`: 17:00 - 22:00
- `fullDay` (Fallback): 08:00 - 22:00

*Rule:* The system never schedules sessions between 22:00 and 08:00 to protect user sleep.

## 4. Execution Flow (The Greedy Approach)
For each session in `aiSessions`, the algorithm attempts to find a valid placement using a **Cascading Fallback Strategy**.

### The Placement Logic (Per Day Iteration):
1. Start from `startDate`.
2. Generate the day's total available window (e.g., 08:00 to 12:00 if `morning`).
3. Subtract all `busySlots` that overlap with this window to get an array of `freeWindows` (e.g., 08:00-09:30, 11:00-12:00).
4. Check if the session's `durationMinutes` fits entirely inside any single `freeWindow`.
5. Check if adding this session keeps the day's total scheduled study time `SUM(durationMinutes) <= (maxHoursPerDay * 60)`.
6. If it fits, assign `startTime` and `endTime`, deduct the time from that window, and move to the next session.
7. If it does not fit, move to the next day (`currentDate + 1`) and repeat.

## 5. Cascading Fallback Strategy (Crucial)
If the algorithm iterates all the way to the `projectDeadline` and a session STILL cannot be scheduled (e.g., the user is too busy during their `preferredTime`), it must NOT fail. It must drop constraints one by one (Soft Constraints):

- **Pass 1 (Ideal):** Try to schedule strictly within `preferredTime` AND respecting `studyOnWeekends`.
- **Pass 2 (Time Compromise):** Reset search from `startDate`. Expand the search window to `fullDay` (08:00 - 22:00). Flag the session: `{ isCompromised: true, compromiseReason: "Scheduled outside preferred time" }`.
- **Pass 3 (Weekend Compromise):** If still unable to fit before the deadline, reset search. Ignore `studyOnWeekends: false` (allow Saturday/Sunday). Flag: `{ compromiseReason: "Scheduled on weekend to meet deadline" }`.
- **Pass 4 (Deadline Violation / Split):** If Pass 3 fails, the user mathematically does not have enough free time. 
  - Schedule it at the earliest possible free slot AFTER the deadline.
  - Flag: `{ isCompromised: true, compromiseReason: "Deadline violated due to lack of free time" }`.

## 6. Edge Cases & Constraints
1. **Splitting Large Sessions:** If a single AI session is 120 minutes, but the largest `freeWindow` before the deadline is 90 minutes, the algorithm should split the session into two (e.g., "Task Part 1" (90m) and "Task Part 2" (30m)).
2. **Date Math:** Must use `date-fns` for all manipulations (adding minutes, checking same day, comparing boundaries). Do not use native `Date.setHours()`.
3. **Timezones:** All `busySlots` and outputs must remain in UTC (ISO 8601 strings), but daily boundary math (08:00 etc.) must be calculated using the user's local timezone.