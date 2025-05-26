import { Router } from 'express';
import path from 'path';
const router = Router();
import { staticRateLimiter } from '../../middlewares/ratelimit';

export default router;

router.get('/', staticRateLimiter, (req, res) => {
  res.sendFile(path.join(__dirname, '../../../../frontend/out/index.html'));
});
