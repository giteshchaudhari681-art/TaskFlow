import { Request, Response, NextFunction } from 'express';
import { aiAnalysisParamsSchema, aiAnalysisBodySchema } from '@taskflow/validation';
import { aiService } from '../services/ai.service.js';
import { sendSuccess, sendError } from '../utils/response.js';

export const analyzeProjectWithAI = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<Response | void> => {
  try {
    const paramsResult = aiAnalysisParamsSchema.safeParse(req.params);
    if (!paramsResult.success) {
      const firstError = paramsResult.error.errors[0]?.message || 'Invalid URL parameters';
      return sendError(res, 'VALIDATION_ERROR', firstError, 400);
    }

    const bodyResult = aiAnalysisBodySchema.safeParse(req.body);
    if (!bodyResult.success) {
      const firstError = bodyResult.error.errors[0]?.message || 'Invalid request body';
      return sendError(res, 'VALIDATION_ERROR', firstError, 400);
    }

    const { organizationId, projectId } = paramsResult.data;
    const { operation, taskId, user_prompt } = bodyResult.data;

    const requestId =
      (req.headers['x-request-id'] as string) ||
      (req.headers['request-id'] as string) ||
      crypto.randomUUID();

    const analysis = await aiService.analyzeProject(
      organizationId,
      projectId,
      req.user!.id,
      operation,
      user_prompt,
      requestId,
      taskId
    );

    return sendSuccess(res, analysis, 200);
  } catch (error) {
    next(error);
  }
};
