import { Router } from 'express';
import { AIOStreams, constants } from '@aiostreams/core';
import { stremioCatalogRateLimiter } from '../../middlewares/ratelimit';
import { createResponse } from '../../utils/responses';

const router = Router();

router.use(stremioCatalogRateLimiter);

router.get('/:type/:id/:extras?.json', async (req, res) => {
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
    const { type, id, extras } = req.params;

    const aiostreams = new AIOStreams(req.userData);
    await aiostreams.initialise();

    const catalog = await aiostreams.getCatalog(type, id, extras);

    if (!catalog) {
      res.status(200).json(
        createResponse(
          {
            success: false,
            error: {
              code: constants.ErrorCode.USER_ERROR,
              message: 'No catalog found',
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
          data: catalog,
        },
        req.originalUrl,
        true
      )
    );
  } catch (error) {
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
