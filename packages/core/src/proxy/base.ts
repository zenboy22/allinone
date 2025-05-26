import { StreamProxyConfig } from '../db';
import { Cache, createLogger, maskSensitiveInfo, Env } from '../utils';

const logger = createLogger('proxy');
const cache = Cache.getInstance<string, string>('publicIp');

export interface ProxyStream {
  url: string;
  filename?: string;
  headers?: {
    request?: Record<string, string>;
    response?: Record<string, string>;
  };
}

export abstract class BaseProxy {
  protected readonly config: StreamProxyConfig;
  private readonly PRIVATE_CIDR =
    /^(10\.|127\.|172\.(1[6-9]|2[0-9]|3[01])\.|192\.168\.)/;

  constructor(config: StreamProxyConfig) {
    // Apply any forced environment variables
    this.config = {
      enabled:
        Env.FORCE_PROXY_ENABLED !== undefined
          ? Env.FORCE_PROXY_ENABLED
          : config.enabled,
      id: Env.FORCE_PROXY_ID !== undefined ? Env.FORCE_PROXY_ID : config.id,
      url: Env.FORCE_PROXY_URL !== undefined ? Env.FORCE_PROXY_URL : config.url,
      credentials:
        Env.FORCE_PROXY_CREDENTIALS !== undefined
          ? Env.FORCE_PROXY_CREDENTIALS
          : config.credentials,
      publicIp:
        Env.FORCE_PROXY_PUBLIC_IP !== undefined
          ? Env.FORCE_PROXY_PUBLIC_IP
          : config.publicIp,
      proxiedAddons:
        Env.FORCE_PROXY_PROXIED_ADDONS !== undefined
          ? Env.FORCE_PROXY_PROXIED_ADDONS
          : config.proxiedAddons,
      proxiedServices:
        Env.FORCE_PROXY_PROXIED_SERVICES !== undefined
          ? Env.FORCE_PROXY_PROXIED_SERVICES
          : config.proxiedServices,
    };
  }

  public getConfig(): StreamProxyConfig {
    return this.config;
  }

  protected abstract generateProxyUrl(endpoint: string): URL;
  protected abstract getPublicIpEndpoint(): string;
  protected abstract getPublicIpFromResponse(data: any): string | null;
  protected abstract generateStreamUrls(
    streams: ProxyStream[]
  ): Promise<string[] | null>;

  public async getPublicIp(): Promise<string | null> {
    try {
      if (!this.config.url) {
        logger.error('Proxy URL is missing');
        throw new Error('Proxy URL is missing');
      }

      if (this.config.publicIp) {
        return this.config.publicIp;
      }

      const proxyUrl = new URL(this.config.url.replace(/\/$/, ''));
      if (this.PRIVATE_CIDR.test(proxyUrl.hostname)) {
        logger.error('Proxy URL is a private IP address, returning null');
        return null;
      }

      const cacheKey = `${this.config.id}:${this.config.url}:${this.config.credentials}`;
      const cachedPublicIp = cache ? cache.get(cacheKey) : null;
      if (cachedPublicIp) {
        logger.debug('Returning cached public IP');
        return cachedPublicIp;
      }

      const ipUrl = this.generateProxyUrl(this.getPublicIpEndpoint());

      if (Env.LOG_SENSITIVE_INFO) {
        logger.debug(`GET ${ipUrl.toString()}`);
      } else {
        logger.debug(
          `GET ${ipUrl.protocol}://${maskSensitiveInfo(ipUrl.hostname)}${ipUrl.port ? `:${ipUrl.port}` : ''}${ipUrl.pathname}`
        );
      }

      const response = await fetch(ipUrl.toString(), {
        method: 'GET',
        headers: this.getHeaders(),
        signal: AbortSignal.timeout(30000), // 30 second timeout
      });

      if (!response.ok) {
        throw new Error(`${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      const publicIp = this.getPublicIpFromResponse(data);

      if (publicIp && cache) {
        cache.set(cacheKey, publicIp, 900); // 15 minute cache
      } else {
        logger.error(
          `Proxy did not respond with a public IP. Response: ${JSON.stringify(data)}`
        );
      }

      return publicIp;
    } catch (error: any) {
      logger.error(`Failed to get public IP: ${error.message}`);
      return null;
    }
  }

  protected abstract getHeaders(): Record<string, string>;

  public async generateUrls(streams: ProxyStream[]): Promise<string[] | null> {
    if (!streams.length) {
      return [];
    }

    if (!this.config) {
      throw new Error('Proxy configuration is missing');
    }

    try {
      return await this.generateStreamUrls(streams);
    } catch (error) {
      logger.error(
        `Failed to generate proxy URLs: ${error instanceof Error ? error.message : String(error)}`
      );
      return null;
    }
  }
}
