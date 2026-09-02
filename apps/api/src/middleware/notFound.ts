import { Request, Response } from 'express';
import { ERROR_CODES, HTTP_STATUS } from '@taskflow/shared';
import { sendError } from '../utils/response.js';

export const notFoundHandler = (req: Request, res: Response): Response => {
  return sendError(
    res,
    ERROR_CODES.NOT_FOUND,
    `Route ${req.method} ${req.originalUrl} not found`,
    HTTP_STATUS.NOT_FOUND
  );
};
