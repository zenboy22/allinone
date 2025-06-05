import { Request, Response, NextFunction } from 'express';
import { createLogger, APIError, constants } from '@aiostreams/core';
import { createResponse } from '../utils/responses';

const logger = createLogger('server');

export const errorMiddleware = (
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if (!err) {
    next();
    return;
  }

  let error;
  if (!(err instanceof APIError)) {
    // log unexpected errors
    logger.error(err);
    logger.error(err.stack);
    error = new APIError(constants.ErrorCode.INTERNAL_SERVER_ERROR);
  } else {
    error = err;
  }

  let stremioResponse = false;
  const match = req.originalUrl.match(
    /\/stremio(?:\/[^\/]+){0,2}\/(stream|catalog|subtitles|meta)/
  );
  if (match) {
    stremioResponse = true;
  }

  res
    .status(
      stremioResponse
        ? req.userData?.hideErrors ||
          req.userData?.hideErrorsForResources?.includes(match![1])
          ? error.statusCode
          : 200
        : error.statusCode
    )
    .json(
      createResponse(
        {
          success: false,
          error: {
            code: error.code,
            message: error.message,
          },
        },
        req.path,
        true
      )
    );
  return;
};
