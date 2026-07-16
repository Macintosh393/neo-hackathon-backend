const prisma = require('../prisma');
const greedyScheduler = require('../services/scheduling/greedyScheduler');

// Mock AI Decomposer session generator (Ukrainian)
const mockDecomposeProject = (title) => {
  return [
    { title: `Аналіз вимог та архітектура для ${title}`, durationMinutes: 90 },
    { title: `Проєктування схеми даних для ${title}`, durationMinutes: 120 },
    { title: `Кодування основного функціоналу ${title}`, durationMinutes: 180 },
    { title: `Написання юніт-тестів для ${title}`, durationMinutes: 90 }
  ];
};

/**
 * Project CRUD and Scheduling Controller.
 */
exports.getProjects = async (req, res, next) => {
  try {
    const { courseId, status } = req.query;
    
    const where = {
      course: {
        userId: req.user.id
      }
    };
    if (courseId) where.courseId = courseId;

    let projects = await prisma.project.findMany({
      where,
      include: {
        sessions: true
      }
    });

    if (status) {
      projects = projects.filter(project => {
        const allCompleted = project.sessions.length > 0 && project.sessions.every(s => s.status === 'COMPLETED');
        return status === 'completed' ? allCompleted : !allCompleted;
      });
    }

    res.status(200).json(projects);
  } catch (error) {
    next(error);
  }
};

exports.createProject = async (req, res, next) => {
  try {
    const { courseId, title, description, deadline } = req.body;

    // Verify course ownership
    const course = await prisma.course.findFirst({
      where: { id: courseId, userId: req.user.id }
    });

    if (!course) {
      return res.status(404).json({
        statusCode: 404,
        error: 'Not Found',
        message: 'Course not found or unauthorized'
      });
    }

    // Fetch user profile (needs persona questionnaire data)
    const user = await prisma.user.findUnique({
      where: { id: req.user.id }
    });

    const persona = user?.persona || {
      courseYear: 3,
      preferredTime: 'evening',
      studyOnWeekends: false,
      maxHoursPerDay: 4
    };

    // AI task decomposition
    const aiSessions = mockDecomposeProject(title);

    // Fetch busy slots from calendar service stub (In Phase 5 we connect to Google Calendar)
    const busySlots = [];

    // Run scheduling pure engine
    const scheduledSessions = greedyScheduler({
      aiSessions,
      persona,
      busySlots,
      projectDeadline: new Date(deadline),
      startDate: new Date()
    });

    // Save project and scheduled sessions in a transaction
    const result = await prisma.$transaction(async (tx) => {
      const project = await tx.project.create({
        data: {
          courseId,
          title,
          description: description || null,
          deadline: new Date(deadline),
          estimatedDifficulty: 'medium'
        }
      });

      const sessionsData = scheduledSessions.map(s => ({
        projectId: project.id,
        title: s.title,
        durationMinutes: s.durationMinutes,
        startTime: new Date(s.startTime),
        endTime: new Date(s.endTime),
        status: 'SCHEDULED',
        isCompromised: s.isCompromised,
        compromiseReason: s.compromiseReason
      }));

      await tx.studySession.createMany({
        data: sessionsData
      });

      const sessions = await tx.studySession.findMany({
        where: { projectId: project.id }
      });

      return {
        ...project,
        sessions
      };
    });

    res.status(201).json(result);

  } catch (error) {
    if (error.code === 'P2002') {
      return res.status(409).json({
        statusCode: 409,
        error: 'Conflict',
        message: 'A project with this title already exists in this course'
      });
    }
    next(error);
  }
};

exports.batchImport = async (req, res, next) => {
  try {
    const { projects } = req.body;
    const importedProjects = [];

    const user = await prisma.user.findUnique({
      where: { id: req.user.id }
    });

    const persona = user?.persona || {
      courseYear: 3,
      preferredTime: 'evening',
      studyOnWeekends: false,
      maxHoursPerDay: 4
    };

    // Process each project sequentially to avoid concurrency issues during transaction
    for (const p of projects) {
      // Find or create course by name
      let course = await prisma.course.findFirst({
        where: { name: p.courseName, userId: req.user.id }
      });

      if (!course) {
        course = await prisma.course.create({
          data: { name: p.courseName, userId: req.user.id }
        });
      }

      const aiSessions = mockDecomposeProject(p.title);
      const scheduledSessions = greedyScheduler({
        aiSessions,
        persona,
        busySlots: [],
        projectDeadline: new Date(p.deadline),
        startDate: new Date()
      });

      const result = await prisma.$transaction(async (tx) => {
        const project = await tx.project.create({
          data: {
            courseId: course.id,
            title: p.title,
            description: p.description || null,
            deadline: new Date(p.deadline),
            estimatedDifficulty: 'medium'
          }
        });

        const sessionsData = scheduledSessions.map(s => ({
          projectId: project.id,
          title: s.title,
          durationMinutes: s.durationMinutes,
          startTime: new Date(s.startTime),
          endTime: new Date(s.endTime),
          status: 'SCHEDULED',
          isCompromised: s.isCompromised,
          compromiseReason: s.compromiseReason
        }));

        await tx.studySession.createMany({
          data: sessionsData
        });

        const sessions = await tx.studySession.findMany({
          where: { projectId: project.id }
        });

        return {
          ...project,
          sessions
        };
      });

      importedProjects.push(result);
    }

    res.status(201).json({
      message: `Successfully imported and scheduled ${projects.length} projects`,
      importedProjects
    });

  } catch (error) {
    next(error);
  }
};

exports.getProjectById = async (req, res, next) => {
  try {
    const { id } = req.params;
    
    const project = await prisma.project.findUnique({
      where: { id },
      include: {
        sessions: true
      }
    });

    if (!project) {
      return res.status(404).json({
        statusCode: 404,
        error: 'Not Found',
        message: 'Project not found'
      });
    }

    res.status(200).json(project);
  } catch (error) {
    next(error);
  }
};

exports.updateProject = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { title, description, deadline } = req.body;

    const data = {};
    if (title !== undefined) data.title = title;
    if (description !== undefined) data.description = description;
    if (deadline !== undefined) data.deadline = new Date(deadline);

    const project = await prisma.project.update({
      where: { id },
      data
    });

    res.status(200).json(project);
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({
        statusCode: 404,
        error: 'Not Found',
        message: 'Project not found'
      });
    }
    next(error);
  }
};

exports.deleteProject = async (req, res, next) => {
  try {
    const { id } = req.params;

    await prisma.project.delete({
      where: { id }
    });

    res.status(204).end();
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({
        statusCode: 404,
        error: 'Not Found',
        message: 'Project not found'
      });
    }
    next(error);
  }
};
