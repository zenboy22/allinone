import { HEADERS_FOR_IP_FORWARDING } from './constants';
import { Env } from './env';
import { createLogger, maskSensitiveInfo } from './logger';
import { fetch, ProxyAgent } from 'undici';

const logger = createLogger('http');

export function makeUrlLogSafe(url: string) {
  // for each component of the path, if it is longer than 10 characters, mask it
  // and replace the query params of key 'password' with '****'
  return url
    .split('/')
    .map((component) => {
      if (component.length > 10 && !component.includes('.')) {
        return maskSensitiveInfo(component);
      }
      return component;
    })
    .join('/')
    .replace(/(?<![^?&])(password=[^&]+)/g, 'password=****');
}

export function makeRequest(
  url: string,
  timeout: number,
  headers: HeadersInit = {},
  forwardIp?: string
) {
  const useProxy = shouldProxy(url);
  headers = new Headers(headers);
  if (forwardIp) {
    for (const header of HEADERS_FOR_IP_FORWARDING) {
      headers.set(header, forwardIp);
    }
  }
  logger.debug(
    `Making a ${useProxy ? 'proxied' : 'direct'} request to ${makeUrlLogSafe(
      url
    )}`
  );
  let response = fetch(url, {
    dispatcher: useProxy ? new ProxyAgent(Env.ADDON_PROXY!) : undefined,
    method: 'GET',
    headers: headers,
    signal: AbortSignal.timeout(timeout),
  });

  return response;
}

function shouldProxy(url: string) {
  let shouldProxy = false;
  let hostname: string;

  try {
    hostname = new URL(url).hostname;
  } catch (error) {
    return false;
  }

  if (!Env.ADDON_PROXY) {
    return false;
  }

  shouldProxy = true;
  if (Env.ADDON_PROXY_CONFIG) {
    for (const rule of Env.ADDON_PROXY_CONFIG.split(',')) {
      const [ruleHostname, ruleShouldProxy] = rule.split(':');
      if (['true', 'false'].includes(ruleShouldProxy) === false) {
        logger.error(`Invalid proxy config: ${rule}`);
        continue;
      }
      if (ruleHostname === '*') {
        shouldProxy = !(ruleShouldProxy === 'false');
      } else if (ruleHostname.startsWith('*')) {
        if (hostname.endsWith(ruleHostname.slice(1))) {
          shouldProxy = !(ruleShouldProxy === 'false');
        }
      }
      if (hostname === ruleHostname) {
        shouldProxy = !(ruleShouldProxy === 'false');
      }
    }
  }

  return shouldProxy;
}
