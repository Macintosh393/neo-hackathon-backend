const router = require('express').Router();
const projectController = require('../controllers/project.controller');
const projectValidator = require('../validators/project.validator');
const authMiddleware = require('../middlewares/auth.middleware');

router.use(authMiddleware);

router.get('/', projectValidator.getProjects, projectController.getProjects);
router.post('/', projectValidator.createProject, projectController.createProject);
router.post('/batch-import', projectValidator.batchImport, projectController.batchImport);
router.get('/:id', projectValidator.getOrDeleteProject, projectController.getProjectById);
router.put('/:id', projectValidator.updateProject, projectController.updateProject);
router.delete('/:id', projectValidator.getOrDeleteProject, projectController.deleteProject);

module.exports = router;
