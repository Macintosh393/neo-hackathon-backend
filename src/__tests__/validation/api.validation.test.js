import request from 'supertest';
import app from '../../app.js';

// We use the Bearer mock token which is accepted by our auth.middleware stub
const authHeader = 'Bearer dummy-token';

describe('API Contract & Input Validation Tests', () => {

  describe('Auth Routing (/api/auth/google)', () => {
    it('POST - should fail validation with 400 if code is missing', async () => {
      const res = await request(app)
        .post('/api/auth/google')
        .send({});
      expect(res.statusCode).toBe(400);
      expect(res.body.error).toBe('Bad Request');
    });

    it('POST - should pass validation and return 200 with AuthResponse payload', async () => {
      const res = await request(app)
        .post('/api/auth/google')
        .send({ code: '4/0AdQt8qgn...' });
      expect(res.statusCode).toBe(200);
      expect(res.body.token).toBeDefined();
      expect(res.body.user).toBeDefined();
      expect(res.body.user.email).toBeDefined();
    });
  });

  describe('User Routing (/api/users)', () => {
    it('GET /me - should return 401 if Authorization header is missing', async () => {
      const res = await request(app).get('/api/users/me');
      expect(res.statusCode).toBe(401);
    });

    it('GET /me - should return 200 with User profile when authorized', async () => {
      const res = await request(app)
        .get('/api/users/me')
        .set('Authorization', authHeader);
      expect(res.statusCode).toBe(200);
      expect(res.body.email).toBeDefined();
    });

    it('PUT /persona - should return 400 if parameters fail validation', async () => {
      const res = await request(app)
        .put('/api/users/persona')
        .set('Authorization', authHeader)
        .send({
          courseYear: 7, // Invalid, max 6
          preferredTime: 'night', // Invalid enum
          studyOnWeekends: 'maybe', // Invalid boolean
          maxHoursPerDay: 15 // Invalid, max 12
        });
      expect(res.statusCode).toBe(400);
    });

    it('PUT /persona - should return 200 and updated User profile when payload is correct', async () => {
      const res = await request(app)
        .put('/api/users/persona')
        .set('Authorization', authHeader)
        .send({
          courseYear: 3,
          preferredTime: 'evening',
          studyOnWeekends: false,
          maxHoursPerDay: 4
        });
      expect(res.statusCode).toBe(200);
      expect(res.body.persona.courseYear).toBe(3);
    });
  });

  describe('Courses Routing (/api/courses)', () => {
    it('GET - should return 200 with list of courses', async () => {
      const res = await request(app)
        .get('/api/courses')
        .set('Authorization', authHeader);
      expect(res.statusCode).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });

    it('POST - should return 400 if name is missing', async () => {
      const res = await request(app)
        .post('/api/courses')
        .set('Authorization', authHeader)
        .send({});
      expect(res.statusCode).toBe(400);
    });

    it('POST - should return 201 with Course payload on success', async () => {
      const res = await request(app)
        .post('/api/courses')
        .set('Authorization', authHeader)
        .send({ name: 'Web Programming' });
      expect(res.statusCode).toBe(201);
      expect(res.body.name).toBe('Web Programming');
      expect(res.body.id).toBeDefined();
    });

    it('PUT /:id - should return 400 if id is not UUID', async () => {
      const res = await request(app)
        .put('/api/courses/not-a-uuid')
        .set('Authorization', authHeader)
        .send({ name: 'Updated' });
      expect(res.statusCode).toBe(400);
    });

    it('PUT /:id - should return 200 and updated Course on success', async () => {
      const uuid = '11111111-1111-4111-8111-111111111111';
      const res = await request(app)
        .put(`/api/courses/${uuid}`)
        .set('Authorization', authHeader)
        .send({ name: 'Computer Networks' });
      expect(res.statusCode).toBe(200);
      expect(res.body.name).toBe('Computer Networks');
    });

    it('DELETE /:id - should return 400 if id is not UUID', async () => {
      const res = await request(app)
        .delete('/api/courses/not-a-uuid')
        .set('Authorization', authHeader);
      expect(res.statusCode).toBe(400);
    });

    it('DELETE /:id - should return 204 on success', async () => {
      const uuid = '11111111-1111-4111-8111-111111111111';
      const res = await request(app)
        .delete(`/api/courses/${uuid}`)
        .set('Authorization', authHeader);
      expect(res.statusCode).toBe(204);
    });
  });

  describe('Projects Routing (/api/projects)', () => {
    const courseId = '22222222-2222-4222-8222-222222222222';
    const projectId = '33333333-3333-4333-8333-333333333333';

    it('GET - should return 200 and support valid query filters', async () => {
      const res = await request(app)
        .get(`/api/projects?courseId=${courseId}&status=active`)
        .set('Authorization', authHeader);
      expect(res.statusCode).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });

    it('GET - should return 400 if courseId filter is not UUID', async () => {
      const res = await request(app)
        .get('/api/projects?courseId=invalid-uuid')
        .set('Authorization', authHeader);
      expect(res.statusCode).toBe(400);
    });

    it('POST - should return 400 if missing courseId, title or deadline', async () => {
      const res = await request(app)
        .post('/api/projects')
        .set('Authorization', authHeader)
        .send({ title: 'No Course ID', deadline: '2026-07-20T23:59:59.000Z' });
      expect(res.statusCode).toBe(400);
    });

    it('POST - should return 400 if deadline is not ISO date-time', async () => {
      const res = await request(app)
        .post('/api/projects')
        .set('Authorization', authHeader)
        .send({ courseId, title: 'Exam prep', deadline: 'tomorrow' });
      expect(res.statusCode).toBe(400);
    });

    it('POST - should return 201 with ProjectWithSessions payload on success', async () => {
      const res = await request(app)
        .post('/api/projects')
        .set('Authorization', authHeader)
        .send({ courseId, title: 'Coursework OS', deadline: '2026-07-20T23:59:59.000Z' });
      expect(res.statusCode).toBe(201);
      expect(res.body.title).toBe('Coursework OS');
      expect(Array.isArray(res.body.sessions)).toBe(true);
    });

    it('POST /batch-import - should return 400 on empty projects list', async () => {
      const res = await request(app)
        .post('/api/projects/batch-import')
        .set('Authorization', authHeader)
        .send({ projects: [] });
      expect(res.statusCode).toBe(400);
    });

    it('POST /batch-import - should return 201 on valid import array', async () => {
      const res = await request(app)
        .post('/api/projects/batch-import')
        .set('Authorization', authHeader)
        .send({
          projects: [
            { courseName: 'OS', title: 'Lab 3', deadline: '2026-07-20T12:00:00Z' }
          ]
        });
      expect(res.statusCode).toBe(201);
      expect(res.body.importedProjects).toBeDefined();
    });

    it('GET /:id - should return 200 on valid UUID', async () => {
      const res = await request(app)
        .get(`/api/projects/${projectId}`)
        .set('Authorization', authHeader);
      expect(res.statusCode).toBe(200);
      expect(res.body.id).toBe(projectId);
    });

    it('PUT /:id - should return 400 on invalid payload types', async () => {
      const res = await request(app)
        .put(`/api/projects/${projectId}`)
        .set('Authorization', authHeader)
        .send({ title: '', deadline: 'yesterday' });
      expect(res.statusCode).toBe(400);
    });

    it('PUT /:id - should return 200 on valid partial updates', async () => {
      const res = await request(app)
        .put(`/api/projects/${projectId}`)
        .set('Authorization', authHeader)
        .send({ title: 'New Title' });
      expect(res.statusCode).toBe(200);
      expect(res.body.title).toBe('New Title');
    });

    it('DELETE /:id - should return 204 on success', async () => {
      const res = await request(app)
        .delete(`/api/projects/${projectId}`)
        .set('Authorization', authHeader);
      expect(res.statusCode).toBe(204);
    });
  });

  describe('Sessions Routing (/api/sessions)', () => {
    const projectId = '33333333-3333-4333-8333-333333333333';
    const sessionId = '44444444-4444-4444-8444-444444444444';

    it('GET - should return 200 and accept range query filters', async () => {
      const res = await request(app)
        .get(`/api/sessions?startDate=2026-07-01T00:00:00Z&endDate=2026-07-31T23:59:59Z`)
        .set('Authorization', authHeader);
      expect(res.statusCode).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });

    it('POST - should return 400 if projectId or title are missing', async () => {
      const res = await request(app)
        .post('/api/sessions')
        .set('Authorization', authHeader)
        .send({ durationMinutes: 60 });
      expect(res.statusCode).toBe(400);
    });

    it('POST - should return 201 and created StudySession on success', async () => {
      const res = await request(app)
        .post('/api/sessions')
        .set('Authorization', authHeader)
        .send({ projectId, title: 'Code schemas', durationMinutes: 120 });
      expect(res.statusCode).toBe(201);
      expect(res.body.title).toBe('Code schemas');
      expect(res.body.durationMinutes).toBe(120);
    });

    it('PUT /:id - should return 400 if status is invalid enum', async () => {
      const res = await request(app)
        .put(`/api/sessions/${sessionId}`)
        .set('Authorization', authHeader)
        .send({ status: 'DONE' }); // Invalid enum, must be COMPLETED
      expect(res.statusCode).toBe(400);
    });

    it('PUT /:id - should return 200 on success', async () => {
      const res = await request(app)
        .put(`/api/sessions/${sessionId}`)
        .set('Authorization', authHeader)
        .send({ status: 'COMPLETED', startTime: '2026-07-16T10:00:00Z', endTime: '2026-07-16T12:00:00Z' });
      expect(res.statusCode).toBe(200);
      expect(res.body.status).toBe('COMPLETED');
    });

    it('DELETE /:id - should return 204 on success', async () => {
      const res = await request(app)
        .delete(`/api/sessions/${sessionId}`)
        .set('Authorization', authHeader);
      expect(res.statusCode).toBe(204);
    });
  });

  describe('Calendar & Dashboard Sync Routing', () => {
    it('GET /api/calendar/view - should return 400 if query range dates are missing', async () => {
      const res = await request(app)
        .get('/api/calendar/view')
        .set('Authorization', authHeader);
      expect(res.statusCode).toBe(400);
    });

    it('GET /api/calendar/view - should return 200 with CalendarViewResponse', async () => {
      const res = await request(app)
        .get('/api/calendar/view?startDate=2026-06-29&endDate=2026-08-02')
        .set('Authorization', authHeader);
      expect(res.statusCode).toBe(200);
      expect(res.body.view).toBeDefined();
      expect(res.body.calendar).toBeDefined();
    });

    it('POST /api/calendar/sync - should return 200 on success', async () => {
      const res = await request(app)
        .post('/api/calendar/sync')
        .set('Authorization', authHeader);
      expect(res.statusCode).toBe(200);
      expect(res.body.scheduledSessionsCount).toBeDefined();
    });

    it('POST /api/calendar/recalculate - should return 200 on success', async () => {
      const res = await request(app)
        .post('/api/calendar/recalculate')
        .set('Authorization', authHeader);
      expect(res.statusCode).toBe(200);
      expect(res.body.rescheduledSessionsCount).toBeDefined();
    });

    it('GET /api/dashboard - should return 200 with DashboardResponse structure', async () => {
      const res = await request(app)
        .get('/api/dashboard')
        .set('Authorization', authHeader);
      expect(res.statusCode).toBe(200);
      expect(res.body.overallProgress).toBeDefined();
      expect(res.body.coursesProgress).toBeDefined();
      expect(res.body.upcomingDeadlines).toBeDefined();
      expect(res.body.todaysAgenda).toBeDefined();
    });
  });

});
