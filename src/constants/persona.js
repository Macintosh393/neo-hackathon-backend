/**
 * Default study persona applied when a user has not yet completed
 * the onboarding questionnaire.
 *
 * Single source of truth — previously duplicated verbatim in
 * project.controller.js (twice) and cron.js.
 */
export const DEFAULT_PERSONA = {
  courseYear: 3,
  preferredTime: 'evening',
  studyOnWeekends: false,
  maxHoursPerDay: 4,
};
