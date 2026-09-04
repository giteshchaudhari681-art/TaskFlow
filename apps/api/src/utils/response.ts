import { Response } from 'express';
import { ApiSuccessResponse, ApiErrorResponse, ApiResponseMeta } from '@taskflow/shared';

export const sendSuccess = <T>(
  res: Response,
  data: T,
  statusCode: number = 200,
  meta?: ApiResponseMeta
): Response => {
  const payload: ApiSuccessResponse<T> = {
    success: true,
    data,
    ...(meta ? { meta } : {}),
  };
  return res.status(statusCode).json(payload);
};

export const sendError = (
  res: Response,
  code: string,
  message: string,
  statusCode: number = 400,
  details?: unknown,
  meta?: unknown
): Response => {
  const payload: ApiErrorResponse & { error: { meta?: unknown } } = {
    success: false,
    error: {
      code,
      message,
      ...(details !== undefined ? { details } : {}),
      ...(meta !== undefined ? { meta } : {}),
    },
  };
  return res.status(statusCode).json(payload);
};
