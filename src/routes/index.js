import express from 'express';
import authRoutes from './auth.routes.js';
import userRoutes from './user.routes.js';
import courseRoutes from './course.routes.js';
import projectRoutes from './project.routes.js';
import sessionRoutes from './session.routes.js';
import calendarRoutes from './calendar.routes.js';
import dashboardRoutes from './dashboard.routes.js';

const router = express.Router();

router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/courses', courseRoutes);
router.use('/projects', projectRoutes);
router.use('/sessions', sessionRoutes);
router.use('/calendar', calendarRoutes);
router.use('/dashboard', dashboardRoutes);

export default router;
