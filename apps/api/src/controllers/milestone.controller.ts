import { Request, Response, NextFunction } from 'express';
import { createMilestoneSchema, updateMilestoneSchema } from '@taskflow/validation';
import { milestoneService } from '../services/milestone.service.js';
import { sendSuccess, sendError } from '../utils/response.js';

export const listMilestones = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<Response | void> => {
  try {
    const organizationId = req.params.organizationId as string;
    const projectId = req.params.projectId as string;
    const milestones = await milestoneService.listMilestones(
      organizationId,
      projectId,
      req.user!.id
    );
    return sendSuccess(res, milestones);
  } catch (err) {
    return next(err);
  }
};

export const createMilestone = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<Response | void> => {
  try {
    const organizationId = req.params.organizationId as string;
    const projectId = req.params.projectId as string;

    const parseResult = createMilestoneSchema.safeParse(req.body);
    if (!parseResult.success) {
      return sendError(res, 'VALIDATION_ERROR', 'Invalid milestone data', 400, parseResult.error.format());
    }

    const milestone = await milestoneService.createMilestone(
      organizationId,
      projectId,
      req.user!.id,
      parseResult.data
    );
    return sendSuccess(res, milestone, 201);
  } catch (err) {
    return next(err);
  }
};

export const getMilestone = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<Response | void> => {
  try {
    const organizationId = req.params.organizationId as string;
    const projectId = req.params.projectId as string;
    const milestoneId = req.params.milestoneId as string;
    const milestone = await milestoneService.getMilestone(
      organizationId,
      projectId,
      milestoneId,
      req.user!.id
    );
    return sendSuccess(res, milestone);
  } catch (err) {
    return next(err);
  }
};

export const updateMilestone = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<Response | void> => {
  try {
    const organizationId = req.params.organizationId as string;
    const projectId = req.params.projectId as string;
    const milestoneId = req.params.milestoneId as string;

    const parseResult = updateMilestoneSchema.safeParse(req.body);
    if (!parseResult.success) {
      return sendError(res, 'VALIDATION_ERROR', 'Invalid milestone update data', 400, parseResult.error.format());
    }

    const milestone = await milestoneService.updateMilestone(
      organizationId,
      projectId,
      milestoneId,
      req.user!.id,
      parseResult.data
    );
    return sendSuccess(res, milestone);
  } catch (err) {
    return next(err);
  }
};

export const deleteMilestone = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<Response | void> => {
  try {
    const organizationId = req.params.organizationId as string;
    const projectId = req.params.projectId as string;
    const milestoneId = req.params.milestoneId as string;
    const result = await milestoneService.deleteMilestone(
      organizationId,
      projectId,
      milestoneId,
      req.user!.id
    );
    return sendSuccess(res, result);
  } catch (err) {
    return next(err);
  }
};

export const getProjectTimeline = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<Response | void> => {
  try {
    const organizationId = req.params.organizationId as string;
    const projectId = req.params.projectId as string;
    const timeline = await milestoneService.getProjectTimeline(
      organizationId,
      projectId,
      req.user!.id
    );
    return sendSuccess(res, timeline);
  } catch (err) {
    return next(err);
  }
};
