import express from 'express';
const router = express.Router();
import * as dashboardController from '../controllers/dashboard.controller.js';
import authMiddleware from '../middlewares/auth.middleware.js';

router.use(authMiddleware);

router.get('/', dashboardController.getDashboard);

export default router;
