import { Router, Request, Response, NextFunction } from 'express';
import { Env, PresetManager, UserRepository } from '@aiostreams/core';
// import { PresetMetadata } from '@aiostreams/core/src/presets';
import { PresetMetadata, StatusResponse } from '@aiostreams/core';
import { APIError } from '@aiostreams/core/';
import { constants, encryptString } from '@aiostreams/core';

const router = Router();

router.get('/', async (req: Request, res: Response) => {
  const info: StatusResponse = {
    version: Env.VERSION,
    commit: Env.GIT_COMMIT,
    buildTime: Env.BUILD_TIME,
    commitTime: Env.BUILD_COMMIT_TIME,
    users: await UserRepository.getUserCount(),
    settings: {
      disabledAddons: [],
      disabledServices: [],
      forced: {
        proxy: {
          enabled: Env.FORCE_PROXY_ENABLED ?? null,
          id: Env.FORCE_PROXY_ID ?? null,
          url: !!Env.FORCE_PROXY_URL
            ? encryptString(Env.FORCE_PROXY_URL).data
            : null,
          publicIp: Env.FORCE_PROXY_PUBLIC_IP ?? null,
          credentials: !!Env.FORCE_PROXY_CREDENTIALS
            ? encryptString(Env.FORCE_PROXY_CREDENTIALS).data
            : null,
          proxiedAddons: Env.FORCE_PROXY_PROXIED_ADDONS ?? null,
          proxiedServices: Env.FORCE_PROXY_PROXIED_SERVICES ?? null,
        },
      },
      defaults: {
        proxy: {
          enabled: Env.DEFAULT_PROXY_ENABLED ?? null,
          id: Env.DEFAULT_PROXY_ID ?? null,
          url: !!Env.DEFAULT_PROXY_URL
            ? encryptString(Env.DEFAULT_PROXY_URL).data
            : null,
          publicIp: Env.DEFAULT_PROXY_PUBLIC_IP ?? null,
          credentials: !!Env.DEFAULT_PROXY_CREDENTIALS
            ? encryptString(Env.DEFAULT_PROXY_CREDENTIALS).data
            : null,
          proxiedAddons: Env.DEFAULT_PROXY_PROXIED_ADDONS ?? null,
          proxiedServices: Env.DEFAULT_PROXY_PROXIED_SERVICES ?? null,
        },
        preferredRegex: Env.DEFAULT_PREFERRED_REGEX_PATTERNS ?? null,
        requiredRegex: Env.DEFAULT_REQUIRED_REGEX_PATTERNS ?? null,
        excludedRegex: Env.DEFAULT_EXCLUDED_REGEX_PATTERNS ?? null,
      },
      presets: PresetManager.getPresetList(),
    },
  };
  res.status(200).json({
    success: true,
    data: info,
  });
});

export default router;
