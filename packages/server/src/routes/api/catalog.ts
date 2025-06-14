import { Router, Request, Response, NextFunction } from 'express';
import { createResponse } from '../../utils/responses';
import {
  createLogger,
  UserData,
  AIOStreams,
  UserDataSchema,
  validateConfig,
  APIError,
  constants,
} from '@aiostreams/core';
import { catalogApiRateLimiter } from '../../middlewares/ratelimit';
const router = Router();

const logger = createLogger('server');
router.use(catalogApiRateLimiter);

router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  const { userData } = req.body;
  try {
    let validatedUserData: UserData;
    try {
      validatedUserData = await validateConfig(userData, false, true);
    } catch (error) {
      next(
        new APIError(
          constants.ErrorCode.USER_INVALID_CONFIG,
          undefined,
          error instanceof Error ? error.message : undefined
        )
      );
      return;
    }
    validatedUserData.catalogModifications = undefined;
    const aio = new AIOStreams(validatedUserData);
    await aio.initialise();
    // return minimal catalog data
    const catalogs = aio.getCatalogs().map((catalog) => ({
      id: catalog.id,
      name: catalog.name,
      type: catalog.type,
      addonName: aio.getAddon(parseInt(catalog.id.split(':')[0])).name,
      hideable: catalog.extra
        ? catalog.extra?.findIndex(
            (extra) =>
              extra.name === 'genre' &&
              extra.options?.length &&
              extra.options.length > 0
          ) !== -1
        : false,
    }));
    res.status(200).json(createResponse({ success: true, data: catalogs }));
  } catch (error) {
    if (error instanceof APIError) {
      next(error);
    } else {
      next(new APIError(constants.ErrorCode.INTERNAL_SERVER_ERROR));
    }
  }
});

export default router;
