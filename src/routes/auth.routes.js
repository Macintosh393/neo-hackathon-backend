import express from 'express';
const router = express.Router();
import * as authController from '../controllers/auth.controller.js';
import { celebrate, Joi, Segments } from 'celebrate';

// Inline validation for simple auth code payload
router.post('/google', celebrate({
  [Segments.BODY]: Joi.object().keys({
    code: Joi.string().required()
  })
}), authController.loginWithGoogle);

export default router;
