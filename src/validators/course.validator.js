import { celebrate, Joi, Segments } from 'celebrate';

const createCourse = celebrate({
  [Segments.BODY]: Joi.object().keys({
    name: Joi.string().trim().min(1).required()
  })
});

const updateCourse = celebrate({
  [Segments.PARAMS]: Joi.object().keys({
    id: Joi.string().guid({ version: 'uuidv4' }).required()
  }),
  [Segments.BODY]: Joi.object().keys({
    name: Joi.string().trim().min(1).required()
  })
});

const deleteCourse = celebrate({
  [Segments.PARAMS]: Joi.object().keys({
    id: Joi.string().guid({ version: 'uuidv4' }).required()
  })
});

export {
  createCourse,
  updateCourse,
  deleteCourse
};
