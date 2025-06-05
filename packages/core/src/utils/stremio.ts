import { Env } from './env';

type ErrorStreamOptions = {
  name?: string;
  description?: string;
  externalUrl?: string;
};

type ErrorSubtitleOptions = {
  error?: string;
  subtitleUrl?: string;
};

export function createErrorStream(options: ErrorStreamOptions = {}) {
  const {
    name = `[❌] ${Env.ADDON_NAME}`,
    description = 'Unknown error',
    externalUrl = 'https://github.com/Viren070/AIOStreams',
  } = options;
  return {
    name,
    description,
    externalUrl,
  };
}

export function createErrorSubtitle(options: ErrorSubtitleOptions = {}) {
  const {
    error = 'Unknown error',
    subtitleUrl = 'https://github.com/Viren070/AIOStreams',
  } = options;
  return {
    id: `error.${error}`,
    lang: `[❌] ${error}`,
    url: subtitleUrl,
  };
}
