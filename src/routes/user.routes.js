import express from 'express';
const router = express.Router();
import * as userController from '../controllers/user.controller.js';
import * as userValidator from '../validators/user.validator.js';
import authMiddleware from '../middlewares/auth.middleware.js';

router.use(authMiddleware);

router.get('/me', userController.getMe);
router.put('/persona', userValidator.putPersona, userController.updatePersona);

export default router;
