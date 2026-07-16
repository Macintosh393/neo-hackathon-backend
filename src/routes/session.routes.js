const router = require('express').Router();
const sessionController = require('../controllers/session.controller');
const sessionValidator = require('../validators/session.validator');
const authMiddleware = require('../middlewares/auth.middleware');

router.use(authMiddleware);

router.get('/', sessionValidator.getSessions, sessionController.getSessions);
router.post('/', sessionValidator.createSession, sessionController.createSession);
router.put('/:id', sessionValidator.updateSession, sessionController.updateSession);
router.delete('/:id', sessionValidator.deleteSession, sessionController.deleteSession);

module.exports = router;
