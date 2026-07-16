const { celebrate, Joi, Segments } = require('celebrate');

const getProjects = celebrate({
  [Segments.QUERY]: Joi.object().keys({
    courseId: Joi.string().guid({ version: 'uuidv4' }).optional(),
    status: Joi.string().valid('active', 'completed').optional()
  })
});

const createProject = celebrate({
  [Segments.BODY]: Joi.object().keys({
    courseId: Joi.string().guid({ version: 'uuidv4' }).required(),
    title: Joi.string().trim().min(1).required(),
    description: Joi.string().allow('', null).optional(),
    deadline: Joi.string().isoDate().required()
  })
});

const batchImport = celebrate({
  [Segments.BODY]: Joi.object().keys({
    projects: Joi.array().items(
      Joi.object().keys({
        courseName: Joi.string().trim().required(),
        title: Joi.string().trim().required(),
        description: Joi.string().allow('', null).optional(),
        deadline: Joi.string().isoDate().required()
      })
    ).min(1).required()
  })
});

const getOrDeleteProject = celebrate({
  [Segments.PARAMS]: Joi.object().keys({
    id: Joi.string().guid({ version: 'uuidv4' }).required()
  })
});

const updateProject = celebrate({
  [Segments.PARAMS]: Joi.object().keys({
    id: Joi.string().guid({ version: 'uuidv4' }).required()
  }),
  [Segments.BODY]: Joi.object().keys({
    title: Joi.string().trim().min(1).optional(),
    description: Joi.string().allow('', null).optional(),
    deadline: Joi.string().isoDate().optional()
  })
});

module.exports = {
  getProjects,
  createProject,
  batchImport,
  getOrDeleteProject,
  updateProject
};
