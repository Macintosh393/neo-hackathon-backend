# Project Implementation Plan: AI Time-Manager Backend

- [x] **Phase 0: API Contract Definition**
  - [x] Review provided `API_SCHEMAS.md`.
  - [x] Generate OpenAPI 3.0 specification file (`swagger.json`).
  - [x] Add missing CRUD endpoints (Courses and Sessions) and finalize `/api/calendar/view`.
  - [x] Incorporate updated `StudySession` fields (`isCompromised` and `compromiseReason`) to `swagger.json` and `PRISMA_TEMPLATE.md`.
  - [x] Obtain user approval on `swagger.json`.

- [x] **Phase 1: Environment Setup & Test Infrastructure**
  - [x] Initialize Node.js project (create `package.json`, install dependencies: `express`, `dotenv`, `@prisma/client`, `celebrate`, `joi`, `date-fns`, `google-auth-library`, `googleapis`, `@google/genai`).
  - [x] Install dev dependencies (`prisma`, `vitest`, `supertest`, `nodemon`).
  - [x] Set up Prisma: Create `prisma/schema.prisma` using `PRISMA_TEMPLATE.md` as base.
  - [x] Run `npx prisma migrate dev` (requires setting up a mock or local database connection, or setting up SQLite/PostgreSQL env).
  - [x] Configure Vitest and create `__tests__` directory.
  - [x] Create strict Vitest Mocks using `vi.mock()` for `@google/genai` and `googleapis`.
  - [x] Set up basic project files structure (`src/app.js`, `src/server.js`, `src/config/env.js`, folders for controllers, routes, services, etc. as defined in `STRUCTURE.md`).

- [x] **Phase 2: Input Validation & Routing TDD**
  - [x] Write Vitest/Supertest test suites for all endpoints based on `swagger.json` validation constraints.
  - [x] Implement Express routes, Controllers, and `celebrate` Joi validation schemas.
  - [x] Run tests and fix code until validation suites pass.

- [x] **Phase 3: Core Algorithm TDD (The Greedy Scheduler)**
  - [x] Write unit tests for `services/scheduling/greedyScheduler.js` covering preferred time bounds, weekends, session duration limits, and fallback levels (compromising preferred times, weekend study, splitting tasks, and deadline violations).
  - [x] Implement the Greedy Scheduler algorithm in `src/services/scheduling/greedyScheduler.js` using `date-fns` until all test cases pass.

- [x] **Phase 4: Database Integration & Dashboard Aggregation**
  - [x] Connect Prisma to the controllers for full CRUD operations.
  - [x] Write integration tests for `GET /api/dashboard`.
  - [x] Implement complex Prisma queries (`groupBy`, `_count`) to calculate `overallProgress`, `coursesProgress`, and `upcomingDeadlines` directly in the database layer.
  - [x] Ensure the complete flow works (from `batch-import` request -> AI mock -> DB saving -> Scheduler -> View Calendar).

- [x] **Phase 5: External Providers (Real Implementation)**
  - [x] Implement `AiAdapter` for Google Gemini API parsing and structured Ukrainian JSON output.
  - [x] Implement `googleCalendar.service.js` handling OAuth2 flow (offline access, refresh token), fetching list of user calendars, filtering out generic ones, querying free/busy schedules, and writing/clearing calendar events.
  - [x] Run tests and verify the code integrates external providers correctly.

- [ ] **Phase 6: Background Jobs (Nightly Rescheduling)**
  - [ ] Write unit tests for the rescheduling cron logic.
  - [ ] Implement midnight cron job (`jobs/cron.js`) using `node-cron` to flag missed sessions and reschedule them automatically.

- [ ] **Phase 7: Final End-to-End Review**
  - [ ] Run the complete test suite.
  - [ ] Code clean up, validation of JSDoc types, and final build check.
