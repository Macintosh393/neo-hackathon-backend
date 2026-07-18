# Neoversity Hackathon - AI Time-Manager Backend

## Overview
AI Time-Manager is an intelligent scheduling backend designed to help Software Engineering students efficiently manage their academic workload. It integrates with Google Calendar and leverages Google Gemini AI to break down complex projects into manageable study sessions. A custom greedy scheduling algorithm then optimally fits these sessions into the student's available calendar slots.

## Tech Stack
- **Runtime Environment:** Node.js
- **Web Framework:** Express.js
- **Database ORM:** Prisma
- **Database Engine:** PostgreSQL
- **AI Integration:** Google GenAI SDK (Gemini 3.1 Flash Lite)
- **External Services:** Google OAuth 2.0, Google Calendar API
- **Testing:** Vitest
- **Validation:** Celebrate (Joi)
- **Background Jobs:** Node-cron
- **Logging:** Pino

## Project Structure
```
├── prisma/
│   └── schema.prisma         # Database schema
├── src/
│   ├── config/               # Environment variables, Logger
│   ├── controllers/          # Express route handlers
│   ├── jobs/                 # Cron jobs for nightly rescheduling
│   ├── middlewares/          # Express middleware (Auth, Error handling)
│   ├── routes/               # API route definitions
│   ├── scheduling/           # Greedy scheduler algorithm
│   ├── services/             # Core business logic (AI, Google Calendar, Projects)
│   ├── utils/                # Utility classes (AppError, asyncHandler)
│   ├── app.js                # Express app setup and middleware registration
│   └── server.js             # Entry point, DB connection, and server startup
├── swagger.json              # OpenAPI 3.0 documentation
└── package.json              # Dependencies and scripts
```

## API Overview
A complete interactive documentation is provided via Swagger UI. Once the server is running, navigate to `http://localhost:3000/api-docs` to view and test the API.

### Core Endpoints
- **Authentication:** `POST /api/auth/google` - Exchanges an OAuth code for a JWT token and syncs the user profile.
- **Health Check:** `GET /api/health` - Server health status.
- **User Profile:** 
  - `GET /api/users/me` - Get current user profile.
  - `PUT /api/users/persona` - Update AI scheduling constraints (max hours, preferred times, etc.).
- **Courses:** `GET /api/courses`, `POST /api/courses`, etc. - Course management.
- **Projects:** 
  - `POST /api/projects` - Manually create a project and trigger AI breakdown.
  - `POST /api/projects/batch-import` - Import bulk projects, automatically parsing them and invoking Gemini AI and the scheduler.
- **Sessions:** `GET /api/sessions` - Retrieve individual study sessions.
- **Dashboard:** `GET /api/dashboard` - Get progress statistics and upcoming deadlines.
- **Calendar:** `GET /api/calendar/view` - Fetch the aggregated Google Calendar and study session view.

## How to Use

### Prerequisites
1. Node.js (v18 or higher)
2. PostgreSQL database
3. A Google Cloud project with OAuth 2.0 Client IDs and Google Calendar API enabled.
4. A Google Gemini API Key.

### Setup Instructions

1. **Clone the repository and install dependencies:**
   ```bash
   npm install
   ```

2. **Configure Environment Variables:**
   Create a `.env` file in the root directory and populate it with your credentials:
   ```env
   PORT=3000
   DATABASE_URL="postgresql://user:password@localhost:5432/time_manager?schema=public"
   JWT_SECRET="your_super_secret_jwt_key"
   CORS_ORIGIN="http://localhost:5173"
   GEMINI_API_KEY="your_gemini_api_key"
   GOOGLE_CLIENT_ID="your_google_client_id.apps.googleusercontent.com"
   GOOGLE_CLIENT_SECRET="your_google_client_secret"
   GOOGLE_CALLBACK_URL="postmessage" # Use "postmessage" for SPA flow
   ```

3. **Initialize the Database:**
   Push the Prisma schema to your PostgreSQL database.
   ```bash
   npx prisma db push
   ```

4. **Run the Application:**
   Start the server.
   ```bash
   npm start
   ```
   The server will start at `http://localhost:3000`.

5. **Run Tests:**
   Execute the test suite using Vitest.
   ```bash
   npm test
   ```
