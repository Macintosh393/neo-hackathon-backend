import express from 'express';
const router = express.Router();
import * as courseController from '../controllers/course.controller.js';
import * as courseValidator from '../validators/course.validator.js';
import authMiddleware from '../middlewares/auth.middleware.js';

router.use(authMiddleware);

router.get('/', courseController.getCourses);
router.post('/', courseValidator.createCourse, courseController.createCourse);
router.put('/:id', courseValidator.updateCourse, courseController.updateCourse);
router.delete('/:id', courseValidator.deleteCourse, courseController.deleteCourse);

export default router;
