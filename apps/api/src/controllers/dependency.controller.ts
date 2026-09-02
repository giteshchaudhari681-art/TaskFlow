import { Request, Response, NextFunction } from 'express';
import { DependencyService } from '../services/dependency.service.js';
import { createDependencySchema } from '@taskflow/validation';
import { sendSuccess, sendError } from '../utils/response.js';

const dependencyService = new DependencyService();

export const getTaskDependencies = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<Response | void> => {
  try {
    const organizationId = req.params.organizationId as string;
    const projectId = req.params.projectId as string;
    const taskId = req.params.taskId as string;

    const dependencies = await dependencyService.getTaskDependencies(
      req.user!.id,
      organizationId,
      projectId,
      taskId
    );
    return sendSuccess(res, dependencies);
  } catch (error) {
    return next(error);
  }
};

export const createDependency = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<Response | void> => {
  try {
    const organizationId = req.params.organizationId as string;
    const projectId = req.params.projectId as string;
    const taskId = req.params.taskId as string;

    const parseResult = createDependencySchema.safeParse(req.body);
    if (!parseResult.success) {
      return sendError(
        res,
        'VALIDATION_ERROR',
        'Invalid dependency input data',
        400,
        parseResult.error.format()
      );
    }

    const dependency = await dependencyService.createDependency(
      req.user!.id,
      organizationId,
      projectId,
      taskId,
      parseResult.data
    );
    return sendSuccess(res, dependency, 201);
  } catch (error) {
    return next(error);
  }
};

export const deleteDependency = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<Response | void> => {
  try {
    const organizationId = req.params.organizationId as string;
    const projectId = req.params.projectId as string;
    const taskId = req.params.taskId as string;
    const dependencyId = req.params.dependencyId as string;

    const result = await dependencyService.deleteDependency(
      req.user!.id,
      organizationId,
      projectId,
      taskId,
      dependencyId
    );
    return sendSuccess(res, result);
  } catch (error) {
    return next(error);
  }
};

export const getProjectDependencyGraph = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<Response | void> => {
  try {
    const organizationId = req.params.organizationId as string;
    const projectId = req.params.projectId as string;

    const graph = await dependencyService.getProjectDependencyGraph(
      req.user!.id,
      organizationId,
      projectId
    );
    return sendSuccess(res, graph);
  } catch (error) {
    return next(error);
  }
};
