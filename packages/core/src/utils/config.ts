import {
  UserData,
  UserDataSchema,
  PresetObject,
  Service,
  Option,
  StreamProxyConfig,
} from '../db/schemas';
import { AIOStreams } from '../main';
import { Preset, PresetManager } from '../presets';
import { createProxy } from '../proxy';
import { constants } from '.';
import { isEncrypted, decryptString, encryptString } from './crypto';
import { Env } from './env';
import { createLogger } from './logger';

const logger = createLogger('core');

const formatZodError = (error: any) => {
  let message = '';
  for (const issue of error.issues) {
    message += `${issue.path.join('.')}: ${issue.message}\n`;
  }
  return message;
};

function getServiceCredentialDefault(
  serviceId: constants.ServiceId,
  credentialId: string
) {
  // env mapping
  switch (serviceId) {
    case constants.REALDEBRID_SERVICE:
      switch (credentialId) {
        case 'apiKey':
          return Env.DEFAULT_REALDEBRID_API_KEY;
      }
      break;
    case constants.ALLEDEBRID_SERVICE:
      switch (credentialId) {
        case 'apiKey':
          return Env.DEFAULT_ALLDEBRID_API_KEY;
      }
      break;
    case constants.PREMIUMIZE_SERVICE:
      switch (credentialId) {
        case 'apiKey':
          return Env.DEFAULT_PREMIUMIZE_API_KEY;
      }
      break;
    case constants.DEBRIDLINK_SERVICE:
      switch (credentialId) {
        case 'apiKey':
          return Env.DEFAULT_DEBRIDLINK_API_KEY;
      }
      break;
    case constants.TORBOX_SERVICE:
      switch (credentialId) {
        case 'apiKey':
          return Env.DEFAULT_TORBOX_API_KEY;
      }
      break;
    case constants.EASYDEBRID_SERVICE:
      switch (credentialId) {
        case 'apiKey':
          return Env.DEFAULT_EASYDEBRID_API_KEY;
      }
      break;
    case constants.PUTIO_SERVICE:
      switch (credentialId) {
        case 'clientId':
          return Env.DEFAULT_PUTIO_CLIENT_ID;
        case 'clientSecret':
          return Env.DEFAULT_PUTIO_CLIENT_SECRET;
      }
      break;
    case constants.PIKPAK_SERVICE:
      switch (credentialId) {
        case 'email':
          return Env.DEFAULT_PIKPAK_EMAIL;
        case 'password':
          return Env.DEFAULT_PIKPAK_PASSWORD;
      }
      break;
    case constants.OFFCLOUD_SERVICE:
      switch (credentialId) {
        case 'apiKey':
          return Env.DEFAULT_OFFCLOUD_API_KEY;
        case 'email':
          return Env.DEFAULT_OFFCLOUD_EMAIL;
        case 'password':
          return Env.DEFAULT_OFFCLOUD_PASSWORD;
      }
      break;
    case constants.SEEDR_SERVICE:
      switch (credentialId) {
        case 'encodedToken':
          return Env.DEFAULT_SEEDR_ENCODED_TOKEN;
      }
      break;
    case constants.EASYNEWS_SERVICE:
      switch (credentialId) {
        case 'username':
          return Env.DEFAULT_EASYNEWS_USERNAME;
        case 'password':
          return Env.DEFAULT_EASYNEWS_PASSWORD;
      }
      break;
    default:
      return null;
  }
}

function getServiceCredentialForced(
  serviceId: constants.ServiceId,
  credentialId: string
) {
  // env mapping
  switch (serviceId) {
    case constants.REALDEBRID_SERVICE:
      switch (credentialId) {
        case 'apiKey':
          return Env.FORCED_REALDEBRID_API_KEY;
      }
      break;
    case constants.ALLEDEBRID_SERVICE:
      switch (credentialId) {
        case 'apiKey':
          return Env.FORCED_ALLDEBRID_API_KEY;
      }
      break;
    case constants.PREMIUMIZE_SERVICE:
      switch (credentialId) {
        case 'apiKey':
          return Env.FORCED_PREMIUMIZE_API_KEY;
      }
      break;
    case constants.DEBRIDLINK_SERVICE:
      switch (credentialId) {
        case 'apiKey':
          return Env.FORCED_DEBRIDLINK_API_KEY;
      }
      break;
    case constants.TORBOX_SERVICE:
      switch (credentialId) {
        case 'apiKey':
          return Env.FORCED_TORBOX_API_KEY;
      }
      break;
    case constants.EASYDEBRID_SERVICE:
      switch (credentialId) {
        case 'apiKey':
          return Env.FORCED_EASYDEBRID_API_KEY;
      }
      break;
    case constants.PUTIO_SERVICE:
      switch (credentialId) {
        case 'clientId':
          return Env.FORCED_PUTIO_CLIENT_ID;
        case 'clientSecret':
          return Env.FORCED_PUTIO_CLIENT_SECRET;
      }
      break;
    case constants.PIKPAK_SERVICE:
      switch (credentialId) {
        case 'email':
          return Env.FORCED_PIKPAK_EMAIL;
        case 'password':
          return Env.FORCED_PIKPAK_PASSWORD;
      }
      break;
    case constants.OFFCLOUD_SERVICE:
      switch (credentialId) {
        case 'apiKey':
          return Env.FORCED_OFFCLOUD_API_KEY;
        case 'email':
          return Env.FORCED_OFFCLOUD_EMAIL;
        case 'password':
          return Env.FORCED_OFFCLOUD_PASSWORD;
      }
      break;
    case constants.SEEDR_SERVICE:
      switch (credentialId) {
        case 'encodedToken':
          return Env.FORCED_SEEDR_ENCODED_TOKEN;
      }
      break;
    case constants.EASYNEWS_SERVICE:
      switch (credentialId) {
        case 'username':
          return Env.FORCED_EASYNEWS_USERNAME;
        case 'password':
          return Env.FORCED_EASYNEWS_PASSWORD;
      }
      break;
    default:
      return null;
  }
}

export function getEnvironmentServiceDetails(): typeof constants.SERVICE_DETAILS {
  return Object.fromEntries(
    Object.entries(constants.SERVICE_DETAILS).map(([id, service]) => [
      id as constants.ServiceId,
      {
        id: service.id,
        name: service.name,
        shortName: service.shortName,
        knownNames: service.knownNames,
        signUpText: service.signUpText,
        credentials: service.credentials.map((cred) => ({
          id: cred.id,
          name: cred.name,
          description: cred.description,
          type: cred.type,
          required: cred.required,
          default: getServiceCredentialDefault(service.id, cred.id)
            ? encryptString(getServiceCredentialDefault(service.id, cred.id)!)
                .data
            : null,
          forced: getServiceCredentialForced(service.id, cred.id)
            ? encryptString(getServiceCredentialForced(service.id, cred.id)!)
                .data
            : null,
        })),
      },
    ])
  ) as typeof constants.SERVICE_DETAILS;
}

export async function validateConfig(
  data: any,
  skipErrorsFromAddonsOrProxies: boolean = false
): Promise<UserData> {
  const { success, data: config, error } = UserDataSchema.safeParse(data);
  if (!success) {
    throw new Error(formatZodError(error));
  }

  if (Env.API_KEY && config.apiKey !== Env.API_KEY) {
    throw new Error(
      'The API Key in the config does not match the API Key in the environment variables'
    );
  }

  // now, validate preset options and service credentials.

  if (config.presets) {
    for (const preset of config.presets) {
      validatePreset(preset);
    }
  }

  if (config.services) {
    config.services = config.services.map((service: Service) =>
      validateService(service)
    );
  }

  if (config.proxy) {
    config.proxy = await validateProxy(
      config.proxy,
      skipErrorsFromAddonsOrProxies
    );
  }

  try {
    await new AIOStreams(config, skipErrorsFromAddonsOrProxies).initialise();
  } catch (error: any) {
    throw new Error(error.message);
  }

  return config;
}

function validateService(service: Service): Service {
  const serviceMeta = getEnvironmentServiceDetails()[service.id];

  if (!serviceMeta) {
    throw new Error(`Service ${service.id} not found`);
  }

  if (serviceMeta.credentials.every((cred) => cred.forced)) {
    service.enabled = true;
  }

  if (service.enabled) {
    for (const credential of serviceMeta.credentials) {
      try {
        service.credentials[credential.id] = validateOption(
          credential,
          service.credentials?.[credential.id]
        );
      } catch (error) {
        throw new Error(
          `The value for credential '${credential.name}' in service '${serviceMeta.name}' is invalid: ${error}`
        );
      }
    }
  }
  return service;
}

function validatePreset(preset: PresetObject) {
  const presetMeta = PresetManager.fromId(preset.id).METADATA;

  const optionMetas = presetMeta.OPTIONS;

  for (const [optionId, optionValue] of Object.entries(preset.options)) {
    const optionMeta = optionMetas.find((option) => option.id === optionId);
    if (!optionMeta) {
      throw new Error(`Option ${optionId} not found in preset ${preset.id}`);
    }
    try {
      preset.options[optionId] = validateOption(optionMeta, optionValue);
    } catch (error) {
      throw new Error(
        `The value for option '${optionMeta.name}' in preset '${presetMeta.NAME}' is invalid: ${error}`
      );
    }
  }
}

function validateOption(option: Option, value: any): any {
  if (option.type === 'multi-select') {
    if (!Array.isArray(value)) {
      throw new Error(
        `Option ${option.id} must be an array, got ${typeof value}`
      );
    }
  }

  if (option.type === 'select') {
    if (typeof value !== 'string') {
      throw new Error(
        `Option ${option.id} must be a string, got ${typeof value}`
      );
    }
  }

  if (option.type === 'boolean') {
    if (typeof value !== 'boolean') {
      throw new Error(
        `Option ${option.id} must be a boolean, got ${typeof value}`
      );
    }
  }

  if (option.type === 'number') {
    if (typeof value !== 'number') {
      throw new Error(
        `Option ${option.id} must be a number, got ${typeof value}`
      );
    }
  }

  if (option.type === 'string') {
    if (typeof value !== 'string') {
      throw new Error(
        `Option ${option.id} must be a string, got ${typeof value}`
      );
    }
  }

  if (option.type === 'password') {
    if (typeof value !== 'string') {
      throw new Error(
        `Option ${option.id} must be a string, got ${typeof value}`
      );
    }

    if (option.forced) {
      value = option.forced;
    }
    if (isEncrypted(value)) {
      const { success, data, error } = decryptString(value);
      if (!success) {
        throw new Error(
          `Option ${option.id} is encrypted but failed to decrypt: ${error}`
        );
      }
      value = data;
    }
  }

  if (option.type === 'url') {
    if (typeof value !== 'string') {
      throw new Error(
        `Option ${option.id} must be a string, got ${typeof value}`
      );
    }
  }

  if (option.required && value === undefined) {
    throw new Error(`Option ${option.id} is required, got ${value}`);
  }

  return value;
}

async function validateProxy(
  proxy: StreamProxyConfig,
  skipProxyErrors: boolean = false
): Promise<StreamProxyConfig> {
  // apply forced values if they exist
  proxy.enabled = Env.FORCE_PROXY_ENABLED ?? proxy.enabled;
  proxy.id = Env.FORCE_PROXY_ID ?? proxy.id;
  proxy.url = Env.FORCE_PROXY_URL ?? proxy.url;
  proxy.credentials = Env.FORCE_PROXY_CREDENTIALS ?? proxy.credentials;
  proxy.publicIp = Env.FORCE_PROXY_PUBLIC_IP ?? proxy.publicIp;
  proxy.proxiedAddons = Env.FORCE_PROXY_DISABLE_PROXIED_ADDONS
    ? undefined
    : proxy.proxiedAddons;
  proxy.proxiedServices =
    Env.FORCE_PROXY_PROXIED_SERVICES ?? proxy.proxiedServices;
  if (proxy.enabled) {
    if (!proxy.id) {
      throw new Error('Proxy ID is required');
    }
    if (!proxy.url) {
      throw new Error('Proxy URL is required');
    }
    if (!proxy.credentials) {
      throw new Error('Proxy credentials are required');
    }

    const ProxyService = createProxy(proxy);

    try {
      proxy.publicIp || (await ProxyService.getPublicIp());
    } catch (error) {
      if (!skipProxyErrors) {
        throw new Error(
          `Failed to get the public IP of the proxy service ${proxy.id}: ${error}`
        );
      }
    }

    if (isEncrypted(proxy.credentials)) {
      const { success, data, error } = decryptString(proxy.credentials);
      if (!success) {
        throw new Error(
          `Proxy credentials for ${proxy.id} are encrypted but failed to decrypt: ${error}`
        );
      }
      proxy.credentials = data;
    }
  }
  return proxy;
}
