## Execution Plan: API-First & TDD Approach (Full MVP Lifecycle)
You must follow strict Test-Driven Development. Do not write business logic until the tests for that specific logic are written and failing (Red phase). Use `vitest` and `supertest`.


### Phase 1: Environment Setup & Test Infrastructure
1. Initialize Node.js, Express, Prisma, and install testing tools: `vitest` and `supertest`.
2. Set up `schema.prisma` (Based on PRISMA_TEMPLATE.md) and run `npx prisma migrate dev` (You'll need a postgress db, you can use the docker-compose.yml (need to create a new one in the project root) to spin one up).
3. Configure Vitest. Create a `__tests__` directory.
4. Create strict Vitest Mocks using `vi.mock()` for `@google/genai` and `googleapis` so that test runs NEVER hit real external servers.

### Phase 2: Input Validation & Routing TDD
1. Write `supertest` cases for all endpoints based entirely on `swagger.json`.
2. Implement Express routes, basic Controllers, and `celebrate` validation middlewares.
3. Run tests via `npx vitest` and fix code until all API validation contracts pass.

### Phase 3: Core Algorithm TDD (The Greedy Scheduler described in the ALGORITHM.md)
1. Write unit tests for `services/scheduling/greedyScheduler.js`. Use `vi.spyOn()` if needed to mock dates. Cover edge cases: 
   - Merging overlapping busy slots from Calendar.
   - Respecting weekend constraints (`studyOnWeekends`).
   - Splitting or shifting sessions that exceed `maxMinutesPerDay`.
2. Implement the scheduling logic until tests pass.

### Phase 4: Database Integration & Dashboard Aggregation
1. Connect Prisma to the controllers for full CRUD operations.
2. Write integration tests for `GET /api/dashboard`.
3. Implement complex Prisma queries (`groupBy`, `_count`) to calculate `overallProgress`, `coursesProgress`, and `upcomingDeadlines` directly in the database layer.
4. Ensure the complete flow works (from `batch-import` request -> AI mock -> DB saving -> Scheduler -> View Calendar).

### Phase 5: External Providers (Real Implementation)
1. Implement the actual `AiAdapter` to call Gemini API with the strict Prompt Template (requesting JSON structured output (described in the AI_INTEGRATION.md)).
2. Implement the actual `googleCalendar.service.js` to handle the OAuth callback, store the `refresh_token`, and fetch `calendar.freebusy.query` across multiple user calendars (described in the GOOGLE_CALENDAR_INTEGRATION.md).
3. Keep the Vitest tests mocked, but ensure the actual code logic handles real-world API error responses (e.g., 429 Too Many Requests from Gemini).

### Phase 6: Background Jobs (Nightly Rescheduling)
1. Write unit tests for the rescheduling logic (finding `MISSED` sessions and shifting them).
2. Implement `jobs/cron.js` using `node-cron` to run at `03:00`.
3. The cron job must silently fetch new tokens via `refresh_token`, recalculate schedules without AI calls, and update the database.

### Phase 7: Final End-to-End Review
1. Run the entire test suite (`npm run test`).
2. Perform a final code cleanup, ensure all error-handling middlewares are catching async errors gracefully.
3. Present the final working backend to the user.