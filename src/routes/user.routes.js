const router = require('express').Router();
const userController = require('../controllers/user.controller');
const userValidator = require('../validators/user.validator');
const authMiddleware = require('../middlewares/auth.middleware');

router.use(authMiddleware);

router.get('/me', userController.getMe);
router.put('/persona', userValidator.putPersona, userController.updatePersona);

module.exports = router;
