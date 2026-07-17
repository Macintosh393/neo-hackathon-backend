import express from 'express';
const router = express.Router();
import * as calendarController from '../controllers/calendar.controller.js';
import * as calendarValidator from '../validators/calendar.validator.js';
import authMiddleware from '../middlewares/auth.middleware.js';

router.use(authMiddleware);

router.get('/view', calendarValidator.getView, calendarController.getView);
router.post('/sync', calendarController.sync);
router.post('/recalculate', calendarController.recalculate);

export default router;
