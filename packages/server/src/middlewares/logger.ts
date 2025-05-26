import { Request, Response, NextFunction } from 'express';
import {
  createLogger,
  getTimeTakenSincePoint,
  maskSensitiveInfo,
} from '@aiostreams/core';

const logger = createLogger('server');

export const maskPath = (path: string) => {
  // for each component of the path, if it is longer than 10 characters, mask it
  return path
    .split('/')
    .map((component) => {
      if (component.length > 10) {
        return maskSensitiveInfo(component);
      }
      return component;
    })
    .join('/');
};

export const loggerMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const startTime = Date.now();

  // Log incoming request
  logger.http({
    type: 'request',
    method: req.method,
    path: maskPath(req.originalUrl),
    query: Object.keys(req.query).length ? req.query : undefined,
    ip: req.userIp ? maskSensitiveInfo(req.userIp) : undefined,
    contentType: req.get('content-type'),
    userAgent: req.get('user-agent'),
    formatted: `${req.method} ${maskPath(req.originalUrl)}${req.userIp ? ` - ${maskSensitiveInfo(req.userIp)}` : ''} - ${req.get('content-type')} - ${req.get('user-agent')}`,
  });

  // Capture response finish event
  res.on('finish', () => {
    // Calculate duration after response is sent
    const duration = getTimeTakenSincePoint(startTime);

    // Log response details
    logger.http({
      type: 'response',
      method: req.method,
      path: maskPath(req.originalUrl),
      statusCode: res.statusCode,
      duration,
      ip: req.userIp ? maskSensitiveInfo(req.userIp) : undefined,
      contentType: res.get('content-type'),
      contentLength: res.get('content-length'),
      formatted: `${req.method} ${maskPath(req.originalUrl)}${req.userIp ? ` - ${maskSensitiveInfo(req.userIp)}` : ''} - Response: ${res.statusCode} - ${duration}ms`,
    });
  });

  next();
};
