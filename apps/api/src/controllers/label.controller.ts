import { Request, Response, NextFunction } from 'express';
import { createLabelSchema, updateLabelSchema, assignTaskLabelSchema } from '@taskflow/validation';
import { labelService } from '../services/label.service.js';
import { sendSuccess, sendError } from '../utils/response.js';

export const listLabels = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<Response | void> => {
  try {
    const organizationId = req.params.organizationId as string;
    const projectId = req.params.projectId as string;

    const labels = await labelService.listLabels(organizationId, projectId, req.user!.id);
    return sendSuccess(res, labels);
  } catch (err: unknown) {
    return next(err);
  }
};

export const createLabel = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<Response | void> => {
  try {
    const organizationId = req.params.organizationId as string;
    const projectId = req.params.projectId as string;

    const parseResult = createLabelSchema.safeParse(req.body);
    if (!parseResult.success) {
      return sendError(
        res,
        'VALIDATION_ERROR',
        'Invalid label creation input data',
        400,
        parseResult.error.format()
      );
    }

    const label = await labelService.createLabel(
      organizationId,
      projectId,
      req.user!.id,
      parseResult.data
    );
    return sendSuccess(res, label, 201);
  } catch (err: unknown) {
    return next(err);
  }
};

export const updateLabel = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<Response | void> => {
  try {
    const organizationId = req.params.organizationId as string;
    const projectId = req.params.projectId as string;
    const labelId = req.params.labelId as string;

    const parseResult = updateLabelSchema.safeParse(req.body);
    if (!parseResult.success) {
      return sendError(
        res,
        'VALIDATION_ERROR',
        'Invalid label update input data',
        400,
        parseResult.error.format()
      );
    }

    const updated = await labelService.updateLabel(
      organizationId,
      projectId,
      labelId,
      req.user!.id,
      parseResult.data
    );
    return sendSuccess(res, updated);
  } catch (err: unknown) {
    return next(err);
  }
};

export const deleteLabel = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<Response | void> => {
  try {
    const organizationId = req.params.organizationId as string;
    const projectId = req.params.projectId as string;
    const labelId = req.params.labelId as string;

    const result = await labelService.deleteLabel(organizationId, projectId, labelId, req.user!.id);
    return sendSuccess(res, result);
  } catch (err: unknown) {
    return next(err);
  }
};

export const assignTaskLabel = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<Response | void> => {
  try {
    const organizationId = req.params.organizationId as string;
    const projectId = req.params.projectId as string;
    const taskId = req.params.taskId as string;

    const parseResult = assignTaskLabelSchema.safeParse(req.body);
    if (!parseResult.success) {
      return sendError(
        res,
        'VALIDATION_ERROR',
        'Invalid task label assignment input data',
        400,
        parseResult.error.format()
      );
    }

    const task = await labelService.assignTaskLabel(
      organizationId,
      projectId,
      taskId,
      parseResult.data.labelId,
      req.user!.id
    );
    return sendSuccess(res, task, 201);
  } catch (err: unknown) {
    return next(err);
  }
};

export const removeTaskLabel = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<Response | void> => {
  try {
    const organizationId = req.params.organizationId as string;
    const projectId = req.params.projectId as string;
    const taskId = req.params.taskId as string;
    const labelId = req.params.labelId as string;

    const task = await labelService.removeTaskLabel(
      organizationId,
      projectId,
      taskId,
      labelId,
      req.user!.id
    );
    return sendSuccess(res, task);
  } catch (err: unknown) {
    return next(err);
  }
};
