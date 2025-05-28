import { Router } from 'express';
import { AIOStreams, constants } from '@aiostreams/core';
import { stremioStreamRateLimiter } from '../../middlewares/ratelimit';
import { createLogger } from '@aiostreams/core';
import { createResponse } from '../../utils/responses';

const logger = createLogger('stremio/stream');
const router = Router();

router.use(stremioStreamRateLimiter);

router.get('/:type/:id.json', async (req, res) => {
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
    logger.debug('Stream request received', {
      type,
      id,
      userData: req.userData,
    });

    const aiostreams = new AIOStreams(req.userData);
    await aiostreams.initialise();

    // Get streams from all addons
    const { streams, errors } = await aiostreams.getStreams(id, type);

    // Transform streams to Stremio format
    const transformedStreams = await aiostreams.transformStreams({
      streams,
      errors,
    });

    logger.info(`Returning ${transformedStreams.length} streams`);

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
    logger.error('Error processing stream request', { error });
    res.status(200).json(
      createResponse(
        {
          success: false,
          error: {
            code: constants.ErrorCode.INTERNAL_SERVER_ERROR,
            message: error instanceof Error ? error.message : String(error),
          },
        },
        req.originalUrl,
        true
      )
    );
  }
});

export default router;
