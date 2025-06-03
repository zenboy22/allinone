import {
  UserData,
  UserDataSchema,
  PresetObject,
  Service,
  Option,
  StreamProxyConfig,
  Group,
} from '../db/schemas';
import { AIOStreams } from '../main';
import { Preset, PresetManager } from '../presets';
import { createProxy } from '../proxy';
import { constants } from '.';
import { isEncrypted, decryptString, encryptString } from './crypto';
import { Env } from './env';
import { createLogger } from './logger';
import { ZodError } from 'zod';
import { ConditionParser } from '../parser/conditions';
import { RPDB } from './rpdb';

const logger = createLogger('core');

export const formatZodError = (error: ZodError) => {
  let errs = [];
  for (const issue of error.issues) {
    errs.push(`Invalid value for ${issue.path.join('.')}: ${issue.message}`);
  }
  return errs.join(' | ');
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
  skipErrorsFromAddonsOrProxies: boolean = false,
  decryptValues: boolean = false
): Promise<UserData> {
  const { success, data: config, error } = UserDataSchema.safeParse(data);
  if (!success) {
    throw new Error(formatZodError(error));
  }

  if (Env.ADDON_PASSWORD && config.addonPassword !== Env.ADDON_PASSWORD) {
    throw new Error(
      'The password in the config does not match the password in the environment variables'
    );
  }

  // now, validate preset options and service credentials.

  if (config.presets) {
    for (const preset of config.presets) {
      validatePreset(preset);
    }
  }

  if (config.groups) {
    for (const group of config.groups) {
      validateGroup(group);
    }
  }

  if (config.services) {
    config.services = config.services.map((service: Service) =>
      validateService(service, decryptValues)
    );
  }

  if (config.proxy) {
    config.proxy = await validateProxy(
      config.proxy,
      skipErrorsFromAddonsOrProxies,
      decryptValues
    );
  }

  if (config.rpdbApiKey) {
    try {
      const rpdb = new RPDB(config.rpdbApiKey);
      await rpdb.validateApiKey();
    } catch (error) {
      throw new Error(`Invalid RPDB API key: ${error}`);
    }
  }

  try {
    await new AIOStreams(
      ensureDecrypted(config), // ensure all values are decrypted so that proper validation can be done.
      skipErrorsFromAddonsOrProxies
    ).initialise();
  } catch (error: any) {
    throw new Error(error.message);
  }

  return config;
}

function ensureDecrypted(config: UserData) {
  const decryptedConfig = { ...config };

  // Helper function to decrypt a value if needed
  const tryDecrypt = (value: any, context: string) => {
    if (!isEncrypted(value)) return value;
    const { success, data, error } = decryptString(value);
    if (!success) {
      throw new Error(`Failed to decrypt ${context}: ${error}`);
    }
    return data;
  };

  // Decrypt service credentials
  for (const service of decryptedConfig.services ?? []) {
    if (!service.credentials) continue;
    for (const [credential, value] of Object.entries(service.credentials)) {
      service.credentials[credential] = tryDecrypt(
        value,
        `credential ${credential}`
      );
    }
  }

  // Decrypt proxy config
  if (decryptedConfig.proxy) {
    const proxy = decryptedConfig.proxy;
    proxy.credentials = tryDecrypt(proxy.credentials, 'proxy credentials');
    proxy.url = tryDecrypt(proxy.url, 'proxy URL');
  }

  return decryptedConfig;
}

function validateService(
  service: Service,
  decryptValues: boolean = false
): Service {
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
          service.credentials?.[credential.id],
          decryptValues
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

function validateGroup(group: Group) {
  if (!group) {
    return;
  }

  // each group must have at least one addon, and we must be able to parse the condition
  if (group.addons.length === 0) {
    throw new Error('Every group must have at least one addon');
  }

  // we must be able to parse the condition
  try {
    const result = ConditionParser.testParse(group.condition);
    if (typeof result !== 'boolean') {
      throw new Error('Group condition must evaluate to a boolean');
    }
  } catch (error) {
    throw new Error(`Group condition is invalid: ${error}`);
  }
}

function validateOption(
  option: Option,
  value: any,
  decryptValues: boolean = false
): any {
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
    if (isEncrypted(value) && decryptValues) {
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
  skipProxyErrors: boolean = false,
  decryptCredentials: boolean = false
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

    if (isEncrypted(proxy.credentials) && decryptCredentials) {
      const { success, data, error } = decryptString(proxy.credentials);
      if (!success) {
        throw new Error(
          `Proxy credentials for ${proxy.id} are encrypted but failed to decrypt: ${error}`
        );
      }
      proxy.credentials = data;
    }
    if (isEncrypted(proxy.url) && decryptCredentials) {
      const { success, data, error } = decryptString(proxy.url);
      if (!success) {
        throw new Error(
          `Proxy URL for ${proxy.id} is encrypted but failed to decrypt: ${error}`
        );
      }
      proxy.url = data;
    }
  }
  return proxy;
}
