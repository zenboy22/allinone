import express, { Request, Response } from 'express';

import { userApi, healthApi, statusApi, formatApi } from './routes/api';
import {
  configure,
  manifest,
  stream,
  catalog,
  meta,
  subtitle,
} from './routes/stremio';

import {
  ipMiddleware,
  loggerMiddleware,
  userDataMiddleware,
  errorMiddleware,
  corsMiddleware,
} from './middlewares';

import { constants, createLogger } from '@aiostreams/core';
import { createResponse } from './utils/responses';
import path from 'path';
const app = express();
const logger = createLogger('server');

app.use(ipMiddleware);
app.use(loggerMiddleware);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// API Routes
const apiRouter = express.Router();
apiRouter.use('/user', userApi);
apiRouter.use('/health', healthApi);
apiRouter.use('/status', statusApi);
apiRouter.use('/format', formatApi);
app.use(`/api/v${constants.API_VERSION}`, apiRouter);

// Stremio Routes
const stremioRouter = express.Router({ mergeParams: true });
stremioRouter.use(corsMiddleware);
// Public routes - no auth needed
stremioRouter.use('/manifest.json', manifest);
stremioRouter.use('/stream', stream);
stremioRouter.use('/configure', configure);

// Protected routes with authentication
const stremioAuthRouter = express.Router({ mergeParams: true });
stremioAuthRouter.use(corsMiddleware);
stremioAuthRouter.use(userDataMiddleware);
stremioAuthRouter.use('/manifest.json', manifest);
stremioAuthRouter.use('/stream', stream);
stremioAuthRouter.use('/configure', configure);
stremioAuthRouter.use('/meta', meta);
stremioAuthRouter.use('/catalog', catalog);
stremioAuthRouter.use('/subtitles', subtitle);

app.use('/stremio', stremioRouter); // For public routes
app.use('/stremio/:uuid/:encryptedPassword', stremioAuthRouter); // For authenticated routes

app.get(
  ['/_next/*', '/assets/*', '/icon.ico', '/favicon.ico', '/logo.png'],
  (req, res) => {
    res.sendFile(path.join(__dirname, '../../frontend/out', req.path));
  }
);

// 404 handler
app.use((req, res) => {
  res.status(404).json(
    createResponse({
      success: false,
      message: 'Not Found',
    })
  );
});

// Error handling middleware should be last
app.use(errorMiddleware);

export default app;
