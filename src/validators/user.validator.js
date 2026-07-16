const { celebrate, Joi, Segments } = require('celebrate');

const putPersona = celebrate({
  [Segments.BODY]: Joi.object().keys({
    courseYear: Joi.number().integer().min(1).max(6).required(),
    preferredTime: Joi.string().valid('morning', 'afternoon', 'evening').required(),
    studyOnWeekends: Joi.boolean().required(),
    maxHoursPerDay: Joi.number().integer().min(1).max(12).required()
  })
});

module.exports = {
  putPersona
};
