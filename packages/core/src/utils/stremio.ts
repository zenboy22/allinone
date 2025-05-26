import { Env } from './env';

type ErrorStreamOptions = {
  name?: string;
  description?: string;
  externalUrl?: string;
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
