const router = require('express').Router();
const authController = require('../controllers/auth.controller');
const { celebrate, Joi, Segments } = require('celebrate');

// Inline validation for simple auth code payload
router.post('/google', celebrate({
  [Segments.BODY]: Joi.object().keys({
    code: Joi.string().required()
  })
}), authController.loginWithGoogle);

module.exports = router;
