const router = require('express').Router();
const calendarController = require('../controllers/calendar.controller');
const calendarValidator = require('../validators/calendar.validator');
const authMiddleware = require('../middlewares/auth.middleware');

router.use(authMiddleware);

router.get('/view', calendarValidator.getView, calendarController.getView);
router.post('/sync', calendarController.sync);
router.post('/recalculate', calendarController.recalculate);

module.exports = router;
