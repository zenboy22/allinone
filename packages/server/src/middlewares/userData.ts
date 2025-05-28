import { Request, Response, NextFunction } from 'express';
import {
  createLogger,
  APIError,
  constants,
  Env,
  decryptString,
} from '@aiostreams/core';
import { UserDataSchema, UserRepository } from '@aiostreams/core';

const logger = createLogger('server');

// Valid resources that require authentication
// const VALID_RESOURCES = ['stream', 'configure'];
const VALID_RESOURCES = [...constants.RESOURCES, 'manifest.json', 'configure'];

export const userDataMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const { uuid, encryptedPassword } = req.params;

  // Both uuid and encryptedPassword should be present since we mounted the router on this path
  if (!uuid || !encryptedPassword) {
    next(new APIError(constants.ErrorCode.USER_NOT_FOUND));
    return;
  }
  // First check - validate path has two components followed by valid resource
  const resourceRegex = new RegExp(`/(${VALID_RESOURCES.join('|')})`);

  const resourceMatch = req.path.match(resourceRegex);
  if (!resourceMatch) {
    next();
    return;
  }

  // Second check - validate UUID format (simpler regex that just checks UUID format)
  const uuidRegex =
    /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
  if (!uuidRegex.test(uuid)) {
    next(new APIError(constants.ErrorCode.USER_NOT_FOUND));
    return;
  }

  const resource = resourceMatch[1];

  try {
    // Check if user exists
    const userExists = await UserRepository.checkUserExists(uuid);
    if (!userExists) {
      next(new APIError(constants.ErrorCode.USER_NOT_FOUND));
      return;
    }

    let password = undefined;

    // decrypt the encrypted password
    const { success: successfulDecryption, data: decryptedPassword } =
      decryptString(encryptedPassword!);
    if (!successfulDecryption) {
      // return Promise.reject(new APIError(constants.ErrorCode.USER_ERROR));
      next(new APIError(constants.ErrorCode.USER_ERROR));
      return;
    }

    // Get and validate user data
    const decryptedConfig = await UserRepository.getUser(
      uuid,
      decryptedPassword
    );
    if (!decryptedConfig) {
      next(new APIError(constants.ErrorCode.USER_INVALID_PASSWORD));
      return;
    }

    // Check if API key matches if required
    if (Env.API_KEY && decryptedConfig.apiKey !== Env.API_KEY) {
      next(new APIError(constants.ErrorCode.USER_INVALID_CONFIG));
      return;
    }

    // Validate config schema
    const { success, data, error } = UserDataSchema.safeParse(decryptedConfig);
    if (!success) {
      next(new APIError(constants.ErrorCode.USER_INVALID_CONFIG));
      return;
    }

    // Attach validated data to request
    req.userData = data;
    req.userData.ip = req.userIp;
    req.uuid = uuid;
    next();
  } catch (error) {
    next(new APIError(constants.ErrorCode.USER_ERROR));
  }
};
