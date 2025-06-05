import { Router } from 'express';
import { AIOStreams, constants } from '@aiostreams/core';
import { createLogger } from '@aiostreams/core';
import { createResponse } from '../../utils/responses';

const logger = createLogger('stremio/subtitle');
const router = Router();

router.get('/:type/:id/:extras?.json', async (req, res, next) => {
  if (!req.userData) {
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
    const { videoHash, videoSize } = req.query;
    const extras = [videoHash, videoSize].filter(Boolean).join(',');

    logger.debug('Subtitle request received', {
      type,
      id,
      extras,
      userData: req.userData,
    });

    const aiostreams = new AIOStreams(req.userData);
    await aiostreams.initialise();

    const { subtitles, errors } = await aiostreams.getSubtitles(
      type,
      id,
      extras
    );

    const transformedSubtitles = aiostreams.transformSubtitles({
      subtitles,
      errors,
    });

    res.status(200).json(
      createResponse(
        {
          success: true,
          data: transformedSubtitles,
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
