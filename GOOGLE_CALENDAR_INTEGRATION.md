# Google Calendar Integration Rules:

1. Use the standard googleapis npm package.

2. For the OAuth URL generation, you MUST use access_type: 'offline' and prompt: 'consent' to ensure a refresh_token is returned. Store this token in the User model.

3. CRITICAL: Checking multiple calendars. To find available time slots, you MUST check all relevant calendars, not just the primary one.

    - First, call calendar.calendarList.list() to fetch the user's calendars.

    - Filter out generic holiday/weather calendars (usually they have accessRole: 'reader' and contain #holiday@group.v.calendar.google.com or similar generic IDs). Keep calendars where the user is owner or writer, plus any specific shared university calendars.

    - Map the filtered calendar IDs into the items array: [{ id: 'primary' }, { id: 'other-id' } ... ].

    - Pass this array to calendar.freebusy.query to get a unified busy schedule across all areas of the user's life.