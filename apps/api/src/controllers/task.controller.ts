import { Request, Response, NextFunction } from 'express';
import {
  createTaskSchema,
  updateTaskSchema,
  createSubtaskSchema,
  updateSubtaskSchema,
} from '@taskflow/validation';
import { TaskStatus, TaskPriority } from '@taskflow/shared';
import { taskService } from '../services/task.service.js';
import { sendSuccess, sendError } from '../utils/response.js';

export const listTasks = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<Response | void> => {
  try {
    const organizationId = req.params.organizationId as string;
    const projectId = req.params.projectId as string;
    const status = req.query.status as TaskStatus | undefined;
    const priority = req.query.priority as TaskPriority | undefined;
    const assigneeId = req.query.assigneeId as string | undefined;
    const search = req.query.search as string | undefined;
    const archived = req.query.archived === 'true';

    const tasks = await taskService.listTasks(organizationId, projectId, req.user!.id, {
      status,
      priority,
      assigneeId,
      search,
      archived,
    });
    return sendSuccess(res, tasks);
  } catch (err: unknown) {
    return next(err);
  }
};

export const createTask = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<Response | void> => {
  try {
    const organizationId = req.params.organizationId as string;
    const projectId = req.params.projectId as string;

    const parseResult = createTaskSchema.safeParse(req.body);
    if (!parseResult.success) {
      return sendError(
        res,
        'VALIDATION_ERROR',
        'Invalid task creation input data',
        400,
        parseResult.error.format()
      );
    }

    const task = await taskService.createTask(
      organizationId,
      projectId,
      req.user!.id,
      parseResult.data
    );
    return sendSuccess(res, task, 201);
  } catch (err: unknown) {
    return next(err);
  }
};

export const getTask = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<Response | void> => {
  try {
    const organizationId = req.params.organizationId as string;
    const projectId = req.params.projectId as string;
    const taskId = req.params.taskId as string;

    const task = await taskService.getTask(organizationId, projectId, taskId, req.user!.id);
    return sendSuccess(res, task);
  } catch (err: unknown) {
    return next(err);
  }
};

export const updateTask = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<Response | void> => {
  try {
    const organizationId = req.params.organizationId as string;
    const projectId = req.params.projectId as string;
    const taskId = req.params.taskId as string;

    const parseResult = updateTaskSchema.safeParse(req.body);
    if (!parseResult.success) {
      return sendError(
        res,
        'VALIDATION_ERROR',
        'Invalid task update input data',
        400,
        parseResult.error.format()
      );
    }

    const task = await taskService.updateTask(
      organizationId,
      projectId,
      taskId,
      req.user!.id,
      parseResult.data
    );
    return sendSuccess(res, task);
  } catch (err: unknown) {
    return next(err);
  }
};

export const archiveTask = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<Response | void> => {
  try {
    const organizationId = req.params.organizationId as string;
    const projectId = req.params.projectId as string;
    const taskId = req.params.taskId as string;

    const task = await taskService.archiveTask(organizationId, projectId, taskId, req.user!.id);
    return sendSuccess(res, task);
  } catch (err: unknown) {
    return next(err);
  }
};

export const unarchiveTask = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<Response | void> => {
  try {
    const organizationId = req.params.organizationId as string;
    const projectId = req.params.projectId as string;
    const taskId = req.params.taskId as string;

    const task = await taskService.unarchiveTask(organizationId, projectId, taskId, req.user!.id);
    return sendSuccess(res, task);
  } catch (err: unknown) {
    return next(err);
  }
};

export const deleteTask = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<Response | void> => {
  try {
    const organizationId = req.params.organizationId as string;
    const projectId = req.params.projectId as string;
    const taskId = req.params.taskId as string;

    const result = await taskService.deleteTask(organizationId, projectId, taskId, req.user!.id);
    return sendSuccess(res, result);
  } catch (err: unknown) {
    return next(err);
  }
};

// ========================================================================
// Subtasks Controller
// ========================================================================

export const listSubtasks = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<Response | void> => {
  try {
    const organizationId = req.params.organizationId as string;
    const projectId = req.params.projectId as string;
    const taskId = req.params.taskId as string;

    const subtasks = await taskService.listSubtasks(
      organizationId,
      projectId,
      taskId,
      req.user!.id
    );
    return sendSuccess(res, subtasks);
  } catch (err: unknown) {
    return next(err);
  }
};

export const createSubtask = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<Response | void> => {
  try {
    const organizationId = req.params.organizationId as string;
    const projectId = req.params.projectId as string;
    const taskId = req.params.taskId as string;

    const parseResult = createSubtaskSchema.safeParse(req.body);
    if (!parseResult.success) {
      return sendError(
        res,
        'VALIDATION_ERROR',
        'Invalid subtask creation input data',
        400,
        parseResult.error.format()
      );
    }

    const subtask = await taskService.createSubtask(
      organizationId,
      projectId,
      taskId,
      req.user!.id,
      parseResult.data
    );
    return sendSuccess(res, subtask, 201);
  } catch (err: unknown) {
    return next(err);
  }
};

export const updateSubtask = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<Response | void> => {
  try {
    const organizationId = req.params.organizationId as string;
    const projectId = req.params.projectId as string;
    const taskId = req.params.taskId as string;
    const subtaskId = req.params.subtaskId as string;

    const parseResult = updateSubtaskSchema.safeParse(req.body);
    if (!parseResult.success) {
      return sendError(
        res,
        'VALIDATION_ERROR',
        'Invalid subtask update input data',
        400,
        parseResult.error.format()
      );
    }

    const subtask = await taskService.updateSubtask(
      organizationId,
      projectId,
      taskId,
      subtaskId,
      req.user!.id,
      parseResult.data
    );
    return sendSuccess(res, subtask);
  } catch (err: unknown) {
    return next(err);
  }
};

export const deleteSubtask = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<Response | void> => {
  try {
    const organizationId = req.params.organizationId as string;
    const projectId = req.params.projectId as string;
    const taskId = req.params.taskId as string;
    const subtaskId = req.params.subtaskId as string;

    const result = await taskService.deleteSubtask(
      organizationId,
      projectId,
      taskId,
      subtaskId,
      req.user!.id
    );
    return sendSuccess(res, result);
  } catch (err: unknown) {
    return next(err);
  }
};
