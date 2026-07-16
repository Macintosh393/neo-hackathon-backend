/**
 * Project CRUD and Batch-import Controller stub.
 */
exports.getProjects = async (req, res, next) => {
  try {
    res.status(200).json([
      {
        id: '33333333-3333-3333-3333-333333333333',
        courseId: req.query.courseId || '22222222-2222-2222-2222-222222222222',
        title: 'Coursework OS',
        description: 'Mock project description',
        deadline: '2026-07-20T23:59:59.000Z',
        estimatedDifficulty: 'medium'
      }
    ]);
  } catch (error) {
    next(error);
  }
};

exports.createProject = async (req, res, next) => {
  try {
    const { courseId, title, description, deadline } = req.body;
    res.status(201).json({
      id: '33333333-3333-3333-3333-333333333333',
      courseId,
      title,
      description: description || null,
      deadline,
      estimatedDifficulty: 'medium',
      sessions: [
        {
          id: '44444444-4444-4444-4444-444444444444',
          projectId: '33333333-3333-3333-3333-333333333333',
          title: 'Аналіз вимог та архітектура',
          durationMinutes: 90,
          startTime: null,
          endTime: null,
          status: 'SCHEDULED',
          isCompromised: false,
          compromiseReason: null
        }
      ]
    });
  } catch (error) {
    next(error);
  }
};

exports.batchImport = async (req, res, next) => {
  try {
    const { projects } = req.body;
    const imported = projects.map((p, idx) => ({
      id: `33333333-3333-3333-3333-33333333333${idx}`,
      courseId: '22222222-2222-2222-2222-222222222222',
      title: p.title,
      description: p.description || null,
      deadline: p.deadline,
      estimatedDifficulty: 'medium',
      sessions: [
        {
          id: `44444444-4444-4444-4444-44444444444${idx}`,
          projectId: `33333333-3333-3333-3333-33333333333${idx}`,
          title: 'Огляд коду',
          durationMinutes: 60,
          startTime: null,
          endTime: null,
          status: 'SCHEDULED',
          isCompromised: false,
          compromiseReason: null
        }
      ]
    }));
    res.status(201).json({
      message: `Successfully imported and scheduled ${projects.length} projects`,
      importedProjects: imported
    });
  } catch (error) {
    next(error);
  }
};

exports.getProjectById = async (req, res, next) => {
  try {
    const { id } = req.params;
    res.status(200).json({
      id,
      courseId: '22222222-2222-2222-2222-222222222222',
      title: 'Coursework OS',
      description: 'Mock description',
      deadline: '2026-07-20T23:59:59.000Z',
      estimatedDifficulty: 'medium',
      sessions: []
    });
  } catch (error) {
    next(error);
  }
};

exports.updateProject = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { title, description, deadline } = req.body;
    res.status(200).json({
      id,
      courseId: '22222222-2222-2222-2222-222222222222',
      title: title || 'Coursework OS',
      description: description || 'Mock description',
      deadline: deadline || '2026-07-20T23:59:59.000Z',
      estimatedDifficulty: 'medium'
    });
  } catch (error) {
    next(error);
  }
};

exports.deleteProject = async (req, res, next) => {
  try {
    res.status(204).end();
  } catch (error) {
    next(error);
  }
};
