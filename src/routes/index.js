const router = require('express').Router();

router.use('/auth', require('./auth.routes'));
router.use('/users', require('./user.routes'));
router.use('/courses', require('./course.routes'));
router.use('/projects', require('./project.routes'));
router.use('/sessions', require('./session.routes'));
router.use('/calendar', require('./calendar.routes'));
router.use('/dashboard', require('./dashboard.routes'));

module.exports = router;
