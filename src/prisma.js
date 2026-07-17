import { PrismaClient } from '@prisma/client';

let prisma;

if (process.env.NODE_ENV === 'test') {
  // Dynamically import vi from Vitest only in the test environment.
  // A static top-level import would fail in production where vitest is not installed.
  const { vi } = await import('vitest');
  // When running tests, we export a mock singleton to isolate controllers
  // and prevent connection errors on localhost:5432.
  prisma = {
    user: {
      findUnique: vi.fn().mockResolvedValue({
        id: '00000000-0000-0000-0000-000000000000',
        email: 'mockstudent@university.edu',
        persona: null,
        createdAt: new Date().toISOString()
      }),
      update: vi.fn().mockImplementation(({ data }) => Promise.resolve({
        id: '00000000-0000-0000-0000-000000000000',
        email: 'mockstudent@university.edu',
        persona: data.persona,
        createdAt: new Date().toISOString()
      })),
      upsert: vi.fn().mockImplementation(({ create }) => Promise.resolve({
        id: '00000000-0000-0000-0000-000000000000',
        email: create.email,
        googleRefreshToken: create.googleRefreshToken,
        persona: null,
        createdAt: new Date().toISOString()
      }))
    },
    course: {
      findMany: vi.fn().mockResolvedValue([]),
      findFirst: vi.fn().mockImplementation(() => Promise.resolve({
        id: '11111111-1111-4111-8111-111111111111',
        userId: 'usr-1',
        name: 'Algorithms'
      })),
      create: vi.fn().mockImplementation(({ data }) => Promise.resolve({
        id: '11111111-1111-4111-8111-111111111111',
        userId: data.userId,
        name: data.name
      })),
      update: vi.fn().mockImplementation(({ where, data }) => Promise.resolve({
        id: where.id,
        userId: where.userId || 'mock-user-id',
        name: data.name
      })),
      delete: vi.fn().mockResolvedValue({})
    },
    project: {
      findMany: vi.fn().mockResolvedValue([]),
      findFirst: vi.fn().mockImplementation(() => Promise.resolve({
        id: '33333333-3333-4333-8333-333333333333',
        courseId: '11111111-1111-4111-8111-111111111111',
        title: 'Mock Project',
        deadline: new Date().toISOString(),
        estimatedDifficulty: 'medium'
      })),
      findUnique: vi.fn().mockResolvedValue({
        id: '33333333-3333-4333-8333-333333333333',
        courseId: '22222222-2222-4222-8222-222222222222',
        title: 'Coursework OS',
        description: 'Mock project description',
        deadline: '2026-07-20T23:59:59.000Z',
        estimatedDifficulty: 'medium',
        sessions: []
      }),
      create: vi.fn().mockImplementation(({ data }) => Promise.resolve({
        id: '33333333-3333-4333-8333-333333333333',
        courseId: data.courseId,
        title: data.title,
        description: data.description || null,
        deadline: data.deadline,
        estimatedDifficulty: 'medium'
      })),
      update: vi.fn().mockImplementation(({ where, data }) => Promise.resolve({
        id: where.id,
        courseId: '22222222-2222-4222-8222-222222222222',
        title: data.title || 'Coursework OS',
        description: data.description || 'Mock project description',
        deadline: data.deadline || '2026-07-20T23:59:59.000Z',
        estimatedDifficulty: 'medium'
      })),
      delete: vi.fn().mockResolvedValue({})
    },
    studySession: {
      findMany: vi.fn().mockResolvedValue([]),
      create: vi.fn().mockImplementation(({ data }) => Promise.resolve({
        id: '44444444-4444-4444-8444-444444444444',
        projectId: data.projectId,
        title: data.title,
        durationMinutes: data.durationMinutes,
        startTime: data.startTime || null,
        endTime: data.endTime || null,
        status: data.status || 'SCHEDULED',
        isCompromised: data.isCompromised || false,
        compromiseReason: data.compromiseReason || null
      })),
      createMany: vi.fn().mockResolvedValue({ count: 4 }),
      update: vi.fn().mockImplementation(({ where, data }) => Promise.resolve({
        id: where.id,
        projectId: '33333333-3333-4333-8333-333333333333',
        title: 'Mock Session',
        durationMinutes: 60,
        startTime: data.startTime || '2026-07-16T10:00:00Z',
        endTime: data.endTime || '2026-07-16T11:00:00Z',
        status: data.status || 'COMPLETED',
        isCompromised: false,
        compromiseReason: null
      })),
      delete: vi.fn().mockResolvedValue({})
    },
    $transaction: vi.fn().mockImplementation((cb) => {
      if (typeof cb === 'function') {
        return cb(prisma);
      }
      return Promise.all(cb);
    })
  };
} else {
  prisma = new PrismaClient();
}

export default prisma;
