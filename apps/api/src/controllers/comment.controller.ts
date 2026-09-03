import { Request, Response, NextFunction } from 'express';
import { createCommentSchema, updateCommentSchema } from '@taskflow/validation';
import { commentService } from '../services/comment.service.js';
import { sendSuccess, sendError } from '../utils/response.js';

export const listComments = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<Response | void> => {
  try {
    const organizationId = req.params.organizationId as string;
    const projectId = req.params.projectId as string;
    const taskId = req.params.taskId as string;

    const comments = await commentService.listComments(
      organizationId,
      projectId,
      taskId,
      req.user!.id
    );

    return sendSuccess(res, comments);
  } catch (err) {
    return next(err);
  }
};

export const createComment = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<Response | void> => {
  try {
    const organizationId = req.params.organizationId as string;
    const projectId = req.params.projectId as string;
    const taskId = req.params.taskId as string;

    const parseResult = createCommentSchema.safeParse(req.body);
    if (!parseResult.success) {
      return sendError(
        res,
        'VALIDATION_ERROR',
        'Invalid comment data',
        400,
        parseResult.error.format()
      );
    }

    const comment = await commentService.createComment(
      organizationId,
      projectId,
      taskId,
      req.user!.id,
      parseResult.data
    );

    return sendSuccess(res, comment, 201);
  } catch (err) {
    return next(err);
  }
};

export const updateComment = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<Response | void> => {
  try {
    const organizationId = req.params.organizationId as string;
    const projectId = req.params.projectId as string;
    const taskId = req.params.taskId as string;
    const commentId = req.params.commentId as string;

    const parseResult = updateCommentSchema.safeParse(req.body);
    if (!parseResult.success) {
      return sendError(
        res,
        'VALIDATION_ERROR',
        'Invalid comment data',
        400,
        parseResult.error.format()
      );
    }

    const comment = await commentService.updateComment(
      organizationId,
      projectId,
      taskId,
      commentId,
      req.user!.id,
      parseResult.data
    );

    return sendSuccess(res, comment);
  } catch (err) {
    return next(err);
  }
};

export const deleteComment = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<Response | void> => {
  try {
    const organizationId = req.params.organizationId as string;
    const projectId = req.params.projectId as string;
    const taskId = req.params.taskId as string;
    const commentId = req.params.commentId as string;

    const result = await commentService.deleteComment(
      organizationId,
      projectId,
      taskId,
      commentId,
      req.user!.id
    );

    return sendSuccess(res, result);
  } catch (err) {
    return next(err);
  }
};
