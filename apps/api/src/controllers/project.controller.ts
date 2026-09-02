import { Request, Response, NextFunction } from 'express';
import {
  createProjectSchema,
  updateProjectSchema,
  addProjectMemberSchema,
  updateProjectMemberRoleSchema,
} from '@taskflow/validation';
import { ProjectStatus } from '@taskflow/shared';
import { projectService } from '../services/project.service.js';
import { sendSuccess, sendError } from '../utils/response.js';

export const listProjects = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<Response | void> => {
  try {
    const organizationId = req.params.organizationId as string;
    const status = req.query.status as ProjectStatus | undefined;
    const search = req.query.search as string | undefined;

    const projects = await projectService.listProjects(organizationId, req.user!.id, {
      status,
      search,
    });
    return sendSuccess(res, projects);
  } catch (err: unknown) {
    return next(err);
  }
};

export const createProject = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<Response | void> => {
  try {
    const organizationId = req.params.organizationId as string;
    const parseResult = createProjectSchema.safeParse(req.body);

    if (!parseResult.success) {
      return sendError(
        res,
        'VALIDATION_ERROR',
        'Invalid project creation input data',
        400,
        parseResult.error.format()
      );
    }

    const project = await projectService.createProject(
      organizationId,
      req.user!.id,
      parseResult.data
    );
    return sendSuccess(res, project, 201);
  } catch (err: unknown) {
    return next(err);
  }
};

export const getProject = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<Response | void> => {
  try {
    const organizationId = req.params.organizationId as string;
    const projectId = req.params.projectId as string;

    const project = await projectService.getProject(organizationId, projectId, req.user!.id);
    return sendSuccess(res, project);
  } catch (err: unknown) {
    return next(err);
  }
};

export const updateProject = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<Response | void> => {
  try {
    const organizationId = req.params.organizationId as string;
    const projectId = req.params.projectId as string;

    const parseResult = updateProjectSchema.safeParse(req.body);
    if (!parseResult.success) {
      return sendError(
        res,
        'VALIDATION_ERROR',
        'Invalid project update input data',
        400,
        parseResult.error.format()
      );
    }

    const updated = await projectService.updateProject(
      organizationId,
      projectId,
      req.user!.id,
      parseResult.data
    );
    return sendSuccess(res, updated);
  } catch (err: unknown) {
    return next(err);
  }
};

export const archiveProject = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<Response | void> => {
  try {
    const organizationId = req.params.organizationId as string;
    const projectId = req.params.projectId as string;

    const archived = await projectService.archiveProject(organizationId, projectId, req.user!.id);
    return sendSuccess(res, archived);
  } catch (err: unknown) {
    return next(err);
  }
};

export const unarchiveProject = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<Response | void> => {
  try {
    const organizationId = req.params.organizationId as string;
    const projectId = req.params.projectId as string;

    const unarchived = await projectService.unarchiveProject(
      organizationId,
      projectId,
      req.user!.id
    );
    return sendSuccess(res, unarchived);
  } catch (err: unknown) {
    return next(err);
  }
};

export const listMembers = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<Response | void> => {
  try {
    const organizationId = req.params.organizationId as string;
    const projectId = req.params.projectId as string;

    const members = await projectService.listMembers(organizationId, projectId, req.user!.id);
    return sendSuccess(res, members);
  } catch (err: unknown) {
    return next(err);
  }
};

export const addMember = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<Response | void> => {
  try {
    const organizationId = req.params.organizationId as string;
    const projectId = req.params.projectId as string;

    const parseResult = addProjectMemberSchema.safeParse(req.body);
    if (!parseResult.success) {
      return sendError(
        res,
        'VALIDATION_ERROR',
        'Invalid member data',
        400,
        parseResult.error.format()
      );
    }

    const member = await projectService.addMember(
      organizationId,
      projectId,
      req.user!.id,
      parseResult.data
    );
    return sendSuccess(res, member, 201);
  } catch (err: unknown) {
    return next(err);
  }
};

export const updateMemberRole = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<Response | void> => {
  try {
    const organizationId = req.params.organizationId as string;
    const projectId = req.params.projectId as string;
    const userId = req.params.userId as string;

    const parseResult = updateProjectMemberRoleSchema.safeParse(req.body);
    if (!parseResult.success) {
      return sendError(
        res,
        'VALIDATION_ERROR',
        'Invalid role data',
        400,
        parseResult.error.format()
      );
    }

    const updated = await projectService.updateMemberRole(
      organizationId,
      projectId,
      req.user!.id,
      userId,
      parseResult.data.role
    );
    return sendSuccess(res, updated);
  } catch (err: unknown) {
    return next(err);
  }
};

export const removeMember = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<Response | void> => {
  try {
    const organizationId = req.params.organizationId as string;
    const projectId = req.params.projectId as string;
    const userId = req.params.userId as string;

    await projectService.removeMember(organizationId, projectId, req.user!.id, userId);
    return sendSuccess(res, { removed: true, userId, projectId });
  } catch (err: unknown) {
    return next(err);
  }
};
