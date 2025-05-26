import { Router, Request, Response, NextFunction } from 'express';
import { createResponse } from '../../utils/responses';
import { createLogger, UserRepository } from '@aiostreams/core';
const router = Router();

const logger = createLogger('server');

router.get('/', async (req: Request, res: Response) => {
  try {
    await UserRepository.getUserCount();
    res.status(200).json(createResponse({ success: true, message: 'OK' }));
  } catch (error) {
    logger.error(error);
    res
      .status(500)
      .json(
        createResponse({ success: false, message: 'Internal Server Error' })
      );
  }
});

export default router;
