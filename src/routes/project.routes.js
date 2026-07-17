import express from 'express';
const router = express.Router();
import * as projectController from '../controllers/project.controller.js';
import * as projectValidator from '../validators/project.validator.js';
import authMiddleware from '../middlewares/auth.middleware.js';

router.use(authMiddleware);

router.get('/', projectValidator.getProjects, projectController.getProjects);
router.post('/', projectValidator.createProject, projectController.createProject);
router.post('/batch-import', projectValidator.batchImport, projectController.batchImport);
router.get('/:id', projectValidator.getOrDeleteProject, projectController.getProjectById);
router.put('/:id', projectValidator.updateProject, projectController.updateProject);
router.delete('/:id', projectValidator.getOrDeleteProject, projectController.deleteProject);

export default router;
