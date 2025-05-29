import { Router } from 'express';
import { AIOStreams, constants } from '@aiostreams/core';
import { stremioStreamRateLimiter } from '../../middlewares/ratelimit';
import { createLogger, APIError } from '@aiostreams/core';
import { createResponse } from '../../utils/responses';
const router = Router();

const logger = createLogger('server');

router.use(stremioStreamRateLimiter);

router.get('/:type/:id.json', async (req, res, next) => {
  // Check if we have user data (set by middleware in authenticated routes)
  if (!req.userData) {
    // Return a response indicating configuration is needed
    res.status(200).json(
      createResponse(
        {
          success: false,
          error: {
            code: constants.ErrorCode.USER_NOT_FOUND,
            message: 'Please configure the addon first',
          },
        },
        req.originalUrl,
        true
      )
    );
    return;
  }

  try {
    const { type, id } = req.params;

    const aiostreams = new AIOStreams(req.userData);
    await aiostreams.initialise();

    // Get streams from all addons
    const { streams, errors } = await aiostreams.getStreams(id, type);

    // Transform streams to Stremio format
    const transformedStreams = await aiostreams.transformStreams({
      streams,
      errors,
    });

    res.status(200).json(
      createResponse(
        {
          success: true,
          data: transformedStreams,
        },
        req.originalUrl,
        true
      )
    );
  } catch (error) {
    next(error);
  }
});

export default router;
