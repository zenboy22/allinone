import { Router } from 'express';
import { AIOStreams, constants } from '@aiostreams/core';
import { createLogger } from '@aiostreams/core';
import { createResponse } from '../../utils/responses';

const logger = createLogger('stremio/addonCatalog');
const router = Router();

router.get('/:type/:id.json', async (req, res, next) => {
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
    logger.debug('Addon catalog request received', {
      type,
      id,
      userData: req.userData,
    });

    const aiostreams = new AIOStreams(req.userData);
    await aiostreams.initialise();

    const addonCatalog = await aiostreams.getAddonCatalog(type, id);

    if (!addonCatalog) {
      res.status(200).json(
        createResponse(
          {
            success: false,
            error: {
              code: constants.ErrorCode.USER_ERROR,
              message: 'No addon catalog found',
            },
          },
          req.originalUrl,
          true
        )
      );
      return;
    }

    res.status(200).json(
      createResponse(
        {
          success: true,
          data: addonCatalog,
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
