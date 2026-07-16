const router = require('express').Router();
const courseController = require('../controllers/course.controller');
const courseValidator = require('../validators/course.validator');
const authMiddleware = require('../middlewares/auth.middleware');

router.use(authMiddleware);

router.get('/', courseController.getCourses);
router.post('/', courseValidator.createCourse, courseController.createCourse);
router.put('/:id', courseValidator.updateCourse, courseController.updateCourse);
router.delete('/:id', courseValidator.deleteCourse, courseController.deleteCourse);

module.exports = router;
