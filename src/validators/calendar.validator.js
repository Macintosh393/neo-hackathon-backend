const { celebrate, Joi, Segments } = require('celebrate');

const getView = celebrate({
  [Segments.QUERY]: Joi.object().keys({
    startDate: Joi.string().isoDate().required(),
    endDate: Joi.string().isoDate().required()
  })
});

module.exports = {
  getView
};
