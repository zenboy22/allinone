import { Router, Request, Response, NextFunction } from 'express';
import {
  Env,
  getEnvironmentServiceDetails,
  PresetManager,
  UserRepository,
} from '@aiostreams/core';
import { StatusResponse } from '@aiostreams/core';
import { encryptString } from '@aiostreams/core';

const router = Router();

router.get('/', async (req: Request, res: Response) => {
  const info: StatusResponse = {
    version: Env.VERSION,
    tag: Env.TAG,
    commit: Env.GIT_COMMIT,
    buildTime: Env.BUILD_TIME,
    commitTime: Env.BUILD_COMMIT_TIME,
    users: await UserRepository.getUserCount(),
    settings: {
      baseUrl: Env.BASE_URL,
      addonName: Env.ADDON_NAME,
      customHtml: Env.CUSTOM_HTML,
      protected: !!Env.ADDON_PASSWORD,
      disabledAddons: [],
      disabledServices: [],
      disableRegexFilters: Env.DISABLE_REGEX_FILTERS,
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
          proxiedServices: Env.FORCE_PROXY_PROXIED_SERVICES ?? null,
          disableProxiedAddons: Env.FORCE_PROXY_DISABLE_PROXIED_ADDONS,
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
          proxiedServices: Env.DEFAULT_PROXY_PROXIED_SERVICES ?? null,
        },
        timeout: Env.DEFAULT_TIMEOUT ?? null,
        preferredRegex: Env.DEFAULT_PREFERRED_REGEX_PATTERNS ?? null,
        requiredRegex: Env.DEFAULT_REQUIRED_REGEX_PATTERNS ?? null,
        excludedRegex: Env.DEFAULT_EXCLUDED_REGEX_PATTERNS ?? null,
      },
      presets: PresetManager.getPresetList(),
      services: getEnvironmentServiceDetails(),
    },
  };
  res.status(200).json({
    success: true,
    data: info,
  });
});

export default router;
