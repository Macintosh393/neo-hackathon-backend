import { celebrate, Joi, Segments } from 'celebrate';

const getView = celebrate({
  [Segments.QUERY]: Joi.object().keys({
    startDate: Joi.string().isoDate().required(),
    endDate: Joi.string().isoDate().required()
  })
});

export {
  getView
};
