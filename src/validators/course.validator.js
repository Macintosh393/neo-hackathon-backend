const { celebrate, Joi, Segments } = require('celebrate');

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

module.exports = {
  createCourse,
  updateCourse,
  deleteCourse
};
