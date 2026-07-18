import request from 'supertest';
import app from '../../app.js';
import prisma from '../../prisma.js';

// Manually mock the singleton instance methods to avoid ESM/CJS module hoisting issues
prisma.user.findUnique = vi.fn();
prisma.user.update = vi.fn();

prisma.course.findMany = vi.fn();
prisma.course.create = vi.fn();
prisma.course.update = vi.fn();
prisma.course.delete = vi.fn();

prisma.project.findMany = vi.fn();
prisma.project.findUnique = vi.fn();
prisma.project.create = vi.fn();
prisma.project.update = vi.fn();
prisma.project.delete = vi.fn();

prisma.studySession.findMany = vi.fn();
prisma.studySession.create = vi.fn();
prisma.studySession.update = vi.fn();
prisma.studySession.delete = vi.fn();

prisma.$transaction = vi.fn((cb) => cb(prisma));

const authHeader = 'Bearer dummy-token';

describe('Database Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('User Profile Integration', () => {
    it('GET /api/users/me - should retrieve user profile from DB', async () => {
      const mockUser = {
        id: '00000000-0000-4000-8000-000000000000',
        email: 'student@university.edu',
        persona: {
          courseYear: 2,
          preferredTime: 'morning',
          studyOnWeekends: true,
          maxHoursPerDay: 3
        },
        createdAt: new Date().toISOString()
      };

      prisma.user.findUnique.mockResolvedValue(mockUser);

      const res = await request(app)
        .get('/api/users/me')
        .set('Authorization', authHeader);

      expect(res.statusCode).toBe(200);
      expect(res.body.email).toBe('student@university.edu');
      expect(res.body.persona.courseYear).toBe(2);
      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: expect.any(String) }
      });
    });

    it('PUT /api/users/persona - should update user persona in DB', async () => {
      const mockUpdatedUser = {
        id: '00000000-0000-4000-8000-000000000000',
        email: 'student@university.edu',
        persona: {
          courseYear: 4,
          preferredTime: 'evening',
          studyOnWeekends: false,
          maxHoursPerDay: 5
        },
        createdAt: new Date().toISOString()
      };

      prisma.user.update.mockResolvedValue(mockUpdatedUser);

      const res = await request(app)
        .put('/api/users/persona')
        .set('Authorization', authHeader)
        .send({
          courseYear: 4,
          preferredTime: 'evening',
          studyOnWeekends: false,
          maxHoursPerDay: 5
        });

      expect(res.statusCode).toBe(200);
      expect(res.body.persona.preferredTime).toBe('evening');
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: expect.any(String) },
        data: {
          persona: {
            courseYear: 4,
            preferredTime: 'evening',
            studyOnWeekends: false,
            maxHoursPerDay: 5
          }
        }
      });
    });
  });

  describe('Course Integration', () => {
    it('GET /api/courses - should retrieve courses from DB', async () => {
      const mockCourses = [
        { id: '11111111-1111-4111-8111-111111111111', userId: 'usr-1', name: 'Software Architecture' }
      ];

      prisma.course.findMany.mockResolvedValue(mockCourses);

      const res = await request(app)
        .get('/api/courses')
        .set('Authorization', authHeader);

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveLength(1);
      expect(res.body[0].name).toBe('Software Architecture');
      expect(prisma.course.findMany).toHaveBeenCalled();
    });

    it('POST /api/courses - should save new course in DB', async () => {
      const mockCourse = { id: '11111111-1111-4111-8111-111111111111', userId: 'usr-1', name: 'Compilers' };

      prisma.course.create.mockResolvedValue(mockCourse);

      const res = await request(app)
        .post('/api/courses')
        .set('Authorization', authHeader)
        .send({ name: 'Compilers' });

      expect(res.statusCode).toBe(201);
      expect(res.body.name).toBe('Compilers');
      expect(prisma.course.create).toHaveBeenCalledWith({
        data: {
          userId: expect.any(String),
          name: 'Compilers'
        }
      });
    });
  });

  describe('Dashboard Integration & Aggregation', () => {
    it('GET /api/dashboard - should calculate correct analytics metrics', async () => {
      // ------------------------------------------------------------------
      // The new dashboard controller uses:
      //  1. studySession.groupBy({ by: ['projectId', 'status'], _count: ... })
      //  2. project.findMany({ select: { ..., course: { select: ... } } })
      //  3. studySession.findMany() for today's agenda
      //
      // Data: 1 course ("Algorithms"), 2 projects, 4 sessions total
      //   Lab 1: 2 COMPLETED → project completed
      //   Lab 2: 1 SCHEDULED + 1 COMPLETED → project in progress
      // Expected: totalSessions=4, completedSessions=3, percentage=75%
      // ------------------------------------------------------------------

      // Mock 1: groupBy returns session counts per project per status
      prisma.studySession.groupBy.mockResolvedValue([
        { projectId: '33333333-3333-4333-8333-333333333333', status: 'COMPLETED', _count: { id: 2 } },
        { projectId: '33333333-3333-4333-8333-333333333334', status: 'SCHEDULED', _count: { id: 1 } },
        { projectId: '33333333-3333-4333-8333-333333333334', status: 'COMPLETED', _count: { id: 1 } },
      ]);

      // Mock 2: project.findMany returns projects with course select (no sessions)
      prisma.project.findMany.mockResolvedValue([
        {
          id: '33333333-3333-4333-8333-333333333333',
          title: 'Lab 1',
          deadline: new Date(2026, 6, 25, 23, 59, 59),
          estimatedDifficulty: 'medium',
          courseId: '11111111-1111-4111-8111-111111111111',
          course: { id: '11111111-1111-4111-8111-111111111111', name: 'Algorithms' },
        },
        {
          id: '33333333-3333-4333-8333-333333333334',
          title: 'Lab 2',
          deadline: new Date(2026, 6, 27, 23, 59, 59),
          estimatedDifficulty: 'hard',
          courseId: '11111111-1111-4111-8111-111111111111',
          course: { id: '11111111-1111-4111-8111-111111111111', name: 'Algorithms' },
        },
      ]);

      // Mock 3: today's agenda sessions
      prisma.studySession.findMany.mockResolvedValue([
        {
          id: 's-5',
          projectId: '33333333-3333-4333-8333-333333333333',
          title: 'Review Lab 1',
          durationMinutes: 60,
          startTime: new Date().toISOString(),
          endTime: new Date().toISOString(),
          status: 'SCHEDULED',
          isCompromised: false,
          compromiseReason: null,
          project: { course: { name: 'Algorithms' } },
        },
      ]);

      const res = await request(app)
        .get('/api/dashboard')
        .set('Authorization', authHeader);

      expect(res.statusCode).toBe(200);

      // Verify overallProgress calculation
      expect(res.body.overallProgress.totalProjects).toBe(2);
      expect(res.body.overallProgress.completedProjects).toBe(1);
      expect(res.body.overallProgress.totalSessions).toBe(4);
      expect(res.body.overallProgress.completedSessions).toBe(3);
      expect(res.body.overallProgress.percentage).toBe(75);

      // Verify course progress calculation
      expect(res.body.coursesProgress).toHaveLength(1);
      expect(res.body.coursesProgress[0].courseName).toBe('Algorithms');
      expect(res.body.coursesProgress[0].totalProjects).toBe(2);
      expect(res.body.coursesProgress[0].completedProjects).toBe(1);
      expect(res.body.coursesProgress[0].percentage).toBe(75);

      // Verify upcoming deadlines progressPercentage calculation
      const lab1Deadline = res.body.upcomingDeadlines.find(d => d.title === 'Lab 1');
      const lab2Deadline = res.body.upcomingDeadlines.find(d => d.title === 'Lab 2');
      expect(lab1Deadline.progressPercentage).toBe(100);
      expect(lab2Deadline.progressPercentage).toBe(50);
      expect(lab1Deadline.daysLeft).toBeDefined();

      // Verify today's agenda sessions
      expect(res.body.todaysAgenda).toHaveLength(1);
      expect(res.body.todaysAgenda[0].courseName).toBe('Algorithms');
    });
  });
});
