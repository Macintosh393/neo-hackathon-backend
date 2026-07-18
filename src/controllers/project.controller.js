/**
 * Project Controller — HTTP Adapter Layer
 *
 * This controller is intentionally thin. All business logic lives in
 * src/services/project.service.js. The controller's sole responsibility
 * is to translate HTTP input → service call → HTTP output.
 */

import asyncHandler from '../utils/asyncHandler.js';
import * as projectService from '../services/project.service.js';

/**
 * GET /api/projects
 * Returns all projects owned by the authenticated user.
 * Supports optional ?courseId= and ?status= query filters.
 */
export const getProjects = asyncHandler(async (req, res) => {
  const projects = await projectService.getProjects(req.user.id, req.query);
  res.status(200).json(projects);
});

/**
 * POST /api/projects
 * Creates a new project with AI-decomposed and greedy-scheduled sessions.
 */
export const createProject = asyncHandler(async (req, res) => {
  const result = await projectService.createProject(req.user.id, req.body, req.log);
  res.status(201).json(result);
});

/**
 * POST /api/projects/batch-import
 * Imports multiple projects in one request.
 * Failed individual projects are skipped — they do not abort the batch.
 */
export const batchImport = asyncHandler(async (req, res) => {
  const { projects } = req.body;
  const { importedProjects, failedCount } = await projectService.batchImportProjects(
    req.user.id,
    projects,
    req.log,
  );

  res.status(201).json({
    message: `Successfully imported and scheduled ${importedProjects.length} of ${projects.length} projects${
      failedCount > 0 ? ` (${failedCount} skipped due to errors)` : ''
    }`,
    importedProjects,
    ...(failedCount > 0 && { failedCount }),
  });
});

/**
 * GET /api/projects/:id
 * Returns a single project by ID.
 */
export const getProjectById = asyncHandler(async (req, res) => {
  const project = await projectService.getProjectById(req.user.id, req.params.id);
  res.status(200).json(project);
});

/**
 * PUT /api/projects/:id
 * Partially updates project metadata (title, description, deadline).
 */
export const updateProject = asyncHandler(async (req, res) => {
  const project = await projectService.updateProject(req.user.id, req.params.id, req.body);
  res.status(200).json(project);
});

/**
 * DELETE /api/projects/:id
 * Deletes a project and all its cascading sessions.
 */
export const deleteProject = asyncHandler(async (req, res) => {
  await projectService.deleteProject(req.user.id, req.params.id);
  res.status(204).end();
});

export default { getProjects, createProject, batchImport, getProjectById, updateProject, deleteProject };
