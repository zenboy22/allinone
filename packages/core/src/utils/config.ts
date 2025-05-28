import {
  UserData,
  UserDataSchema,
  PresetObject,
  Service,
  Option,
} from '../db/schemas';
import { AIOStreams } from '../main';
import { Preset, PresetManager } from '../presets';
import { SERVICE_DETAILS } from './constants';
import { Env } from './env';

const formatZodError = (error: any) => {
  let message = '';
  for (const issue of error.issues) {
    message += `${issue.path.join('.')}: ${issue.message}\n`;
  }
  return message;
};

export async function validateConfig(
  config: any,
  skipFailedAddons: boolean = false
): Promise<UserData> {
  const { success, data, error } = UserDataSchema.safeParse(config);
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
    for (const service of config.services.filter((s: Service) => s.enabled)) {
      validateService(service);
    }
  }

  try {
    await new AIOStreams(data, skipFailedAddons).initialise();
  } catch (error: any) {
    throw new Error(error.message);
  }

  return data;
}

function validateService(service: Service) {
  const serviceMeta = SERVICE_DETAILS?.[service.id];

  if (!serviceMeta) {
    throw new Error(`Service ${service.id} not found`);
  }

  for (const credential of serviceMeta.credentials) {
    try {
      validateOption(credential, service.credentials?.[credential.id]);
    } catch (error) {
      throw new Error(
        `The value for credential '${credential.name}' in service '${serviceMeta.name}' is invalid: ${error}`
      );
    }
  }
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
      validateOption(optionMeta, optionValue);
    } catch (error) {
      throw new Error(
        `The value for option '${optionMeta.name}' in preset '${presetMeta.NAME}' is invalid: ${error}`
      );
    }
  }
}

function validateOption(option: Option, value: any) {
  if (option.type === 'multi-select') {
    if (!Array.isArray(value)) {
      throw new Error(`Option ${option.id} must be an array`);
    }
  }

  if (option.type === 'select') {
    if (typeof value !== 'string') {
      throw new Error(`Option ${option.id} must be a string`);
    }
  }

  if (option.type === 'boolean') {
    if (typeof value !== 'boolean') {
      throw new Error(`Option ${option.id} must be a boolean`);
    }
  }

  if (option.type === 'number') {
    if (typeof value !== 'number') {
      throw new Error(`Option ${option.id} must be a number`);
    }
  }

  if (option.type === 'string') {
    if (typeof value !== 'string') {
      throw new Error(`Option ${option.id} must be a string`);
    }
  }

  if (option.type === 'url') {
    if (typeof value !== 'string') {
      throw new Error(`Option ${option.id} must be a string`);
    }
  }

  if (option.required && value === undefined) {
    throw new Error(`Option ${option.id} is required `);
  }
}
