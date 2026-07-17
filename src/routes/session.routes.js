import express from 'express';
const router = express.Router();
import * as sessionController from '../controllers/session.controller.js';
import * as sessionValidator from '../validators/session.validator.js';
import authMiddleware from '../middlewares/auth.middleware.js';

router.use(authMiddleware);

router.get('/', sessionValidator.getSessions, sessionController.getSessions);
router.post('/', sessionValidator.createSession, sessionController.createSession);
router.put('/:id', sessionValidator.updateSession, sessionController.updateSession);
router.delete('/:id', sessionValidator.deleteSession, sessionController.deleteSession);

export default router;
