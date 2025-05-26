import { Router } from 'express';
import { AIOStreams, Env, getSimpleTextHash, UserData } from '@aiostreams/core';
import { Manifest } from '@aiostreams/core';
import { createLogger } from '@aiostreams/core';

const logger = createLogger('stremio/manifest');
const router = Router();

export default router;

const manifest = async (config?: UserData): Promise<Manifest> => {
  let addonId = Env.ADDON_ID;
  if (config && Env.DETERMINISTIC_ADDON_ID) {
    addonId = addonId += `.${config.uuid?.substring(0, 12)}`;
  }
  let catalogs: Manifest['catalogs'] = [];
  let resources: Manifest['resources'] = [];
  if (config) {
    const aiostreams = new AIOStreams(config);
    // wait till initialized
    await aiostreams.initialise();
    catalogs = aiostreams.getCatalogs();
    resources = aiostreams.getResources();
  }
  return {
    name: config?.addonName || Env.ADDON_NAME,
    id: addonId,
    version: Env.VERSION,
    description: config?.addonDescription || Env.DESCRIPTION,
    catalogs,
    resources,
    background:
      config?.addonBackground ||
      'https://raw.githubusercontent.com/Viren070/AIOStreams/refs/heads/main/packages/frontend/public/assets/background.png',
    logo:
      config?.addonLogo ||
      'https://raw.githubusercontent.com/Viren070/AIOStreams/refs/heads/main/packages/frontend/public/assets/logo.png',
    types: [],
    behaviorHints: {
      configurable: true,
      configurationRequired: config ? false : true,
    },
    stremioAddonsConfig:
      Env.STREMIO_ADDONS_CONFIG_ISSUER && Env.STREMIO_ADDONS_CONFIG_SIGNATURE
        ? {
            issuer: Env.STREMIO_ADDONS_CONFIG_ISSUER,
            signature: Env.STREMIO_ADDONS_CONFIG_SIGNATURE,
          }
        : undefined,
  };
};

router.get('/', async (req, res) => {
  logger.debug('Manifest request received', { userData: req.userData });
  res.status(200).json(await manifest(req.userData));
});
