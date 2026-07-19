import express from 'express';
import * as userController from '../controllers/user.controller.js';
import * as userValidator from '../validators/user.validator.js';
import authMiddleware from '../middlewares/auth.middleware.js';

const router = express.Router();

router.use(authMiddleware);

router.get('/me', userController.getMe);
router.put('/persona', userValidator.putPersona, userController.updatePersona);
router.delete('/me/data', userController.resetUserData);

export default router;
