import { celebrate, Joi, Segments } from 'celebrate';

const putPersona = celebrate({
  [Segments.BODY]: Joi.object().keys({
    courseYear: Joi.number().integer().min(1).max(6).required(),
    preferredTime: Joi.string().valid('morning', 'afternoon', 'evening').required(),
    studyOnWeekends: Joi.boolean().required(),
    maxHoursPerDay: Joi.number().integer().min(1).max(12).required(),
    // IANA timezone string (e.g. "Europe/Kyiv", "America/New_York")
    // Optional — defaults to "Europe/Kyiv" on the User model
    timezone: Joi.string().max(64).optional()
  })
});

export {
  putPersona
};

