import {
  createErrorStream,
  createErrorSubtitle,
  createLogger,
  makeUrlLogSafe,
} from '@aiostreams/core';
const logger = createLogger('server');

type ApiResponseOptions = {
  success: boolean;
  /**
   * @deprecated Use detail instead
   */
  message?: string;
  detail?: string;
  data?: any;
  error?: {
    code: string;
    message: string;
  };
};

export function createResponse(
  options: ApiResponseOptions,
  path?: string,
  adaptResponses?: boolean
) {
  const { success, data, error } = options;
  let type: string = 'api';
  // adapt responses for path specific response types
  let stremioResponse = false;
  if (adaptResponses && path) {
    const match = path?.match(
      /\/stremio(?:\/[^\/]+){0,2}\/(stream|catalog|subtitles|meta|addon_catalog)/
    );
    if (match) {
      stremioResponse = true;
      type = match[1];
    }
  }

  logger.debug('Creating response object', {
    success,
    error,
    type,
    path: path ? makeUrlLogSafe(path) : undefined,
    adaptResponses,
  });

  switch (type) {
    case 'stream':
      if (success) {
        return {
          streams: data,
        };
      } else if (error) {
        return {
          streams: [createErrorStream({ description: error?.message })],
        };
      }
    case 'subtitles':
      if (success) {
        return {
          subtitles: data,
        };
      } else if (error) {
        return {
          subtitles: [createErrorSubtitle({ error: error?.message })],
        };
      }
    case 'catalog':
      if (success) {
        return {
          metas: data,
        };
      }
    case 'meta':
      if (success) {
        return {
          meta: data,
        };
      }
    case 'addon_catalog':
      if (success) {
        return {
          addons: data,
        };
      }
    default:
      return {
        success,
        detail: options.message || null,
        data: data || null,
        error: error || null,
      };
  }
}
