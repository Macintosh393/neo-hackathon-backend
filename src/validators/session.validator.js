import { celebrate, Joi, Segments } from 'celebrate';

const getSessions = celebrate({
  [Segments.QUERY]: Joi.object().keys({
    startDate: Joi.string().isoDate().optional(),
    endDate: Joi.string().isoDate().optional(),
    projectId: Joi.string().guid({ version: 'uuidv4' }).optional()
  })
});

const createSession = celebrate({
  [Segments.BODY]: Joi.object().keys({
    projectId: Joi.string().guid({ version: 'uuidv4' }).required(),
    title: Joi.string().trim().min(1).required(),
    durationMinutes: Joi.number().integer().min(1).required(),
    startTime: Joi.string().isoDate().allow(null).optional(),
    endTime: Joi.string().isoDate().allow(null).optional()
  })
});

const updateSession = celebrate({
  [Segments.PARAMS]: Joi.object().keys({
    id: Joi.string().guid({ version: 'uuidv4' }).required()
  }),
  [Segments.BODY]: Joi.object().keys({
    startTime: Joi.string().isoDate().allow(null).optional(),
    endTime: Joi.string().isoDate().allow(null).optional(),
    status: Joi.string().valid('SCHEDULED', 'COMPLETED', 'MISSED').optional()
  })
});

const deleteSession = celebrate({
  [Segments.PARAMS]: Joi.object().keys({
    id: Joi.string().guid({ version: 'uuidv4' }).required()
  })
});

export {
  getSessions,
  createSession,
  updateSession,
  deleteSession
};
