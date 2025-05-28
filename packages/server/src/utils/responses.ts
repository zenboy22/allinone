import {
  createErrorStream,
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
  if (adaptResponses && path) {
    if (path.match(/\/stremio(?:\/[^\/]+){0,2}\/stream/)) {
      type = 'stream';
    } else if (path.match(/\/stremio(?:\/[^\/]+){0,2}\/catalog/)) {
      type = 'catalog';
    } else if (path.match(/\/stremio(?:\/[^\/]+){0,2}\/subtitles/)) {
      type = 'subtitles';
    } else if (path.match(/\/stremio(?:\/[^\/]+){0,2}\/meta/)) {
      type = 'meta';
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
    default:
      return {
        success,
        detail: options.message || null,
        data: data || null,
        error: error || null,
      };
  }
}
