import {
  Addon,
  AddonCatalog,
  AddonCatalogResponse,
  AddonCatalogResponseSchema,
  CatalogResponse,
  CatalogResponseSchema,
  Manifest,
  ManifestSchema,
  Meta,
  MetaPreview,
  MetaResponse,
  MetaResponseSchema,
  ParsedStream,
  Resource,
  Stream,
  StreamResponse,
  StreamResponseSchema,
  Subtitle,
  SubtitleResponse,
  SubtitleResponseSchema,
} from './db/schemas';
import {
  Cache,
  makeRequest,
  createLogger,
  constants,
  maskSensitiveInfo,
  makeUrlLogSafe,
  formatZodError,
} from './utils';
import { PresetManager } from './presets';
import { StreamParser } from './parser';
import { z } from 'zod';

const logger = createLogger('wrappers');
// const cache = Cache.getInstance<string, any>('wrappers');
const manifestCache = Cache.getInstance<string, Manifest>('manifest');
const resourceCache = Cache.getInstance<string, any>('resources');

const RESOURCE_TTL = 5 * 60;
const MANIFEST_TTL = 10 * 60;

type ResourceParams = {
  type: string;
  id: string;
  extras?: string;
};

export class Wrapper {
  private readonly baseUrl: string;
  private readonly addon: Addon;

  constructor(addon: Addon) {
    this.addon = addon;
    this.baseUrl = this.addon.manifestUrl.split('/').slice(0, -1).join('/');
  }

  async getManifest(): Promise<Manifest> {
    return await manifestCache.wrap(
      async () => {
        logger.debug(
          `Fetching manifest for ${this.addon.name} (${makeUrlLogSafe(this.addon.manifestUrl)})`
        );
        try {
          const res = await makeRequest(
            this.addon.manifestUrl,
            this.addon.timeout,
            this.addon.headers
          );
          if (!res.ok) {
            logger.error(
              `Failed to fetch manifest for ${this.addon.name}: ${res.status} - ${res.statusText}`
            );
            throw new Error(`Failed to fetch manifest for ${this.addon.name}`);
          }
          const data = await res.json();
          const manifest = ManifestSchema.safeParse(data);
          if (!manifest.success) {
            logger.error(`Manifest response was unexpected`);
            logger.error(formatZodError(manifest.error));
            logger.error(JSON.stringify(data, null, 2));
            throw new Error(`Failed to parse manifest for ${this.addon.name}`);
          }
          return manifest.data;
        } catch (error: any) {
          logger.error(
            `Failed to fetch manifest for ${this.addon.name}: ${error.message}`
          );
          throw new Error(
            `Failed to fetch manifest for ${this.addon.name}: ${error.message}`
          );
        }
      },
      this.addon.manifestUrl,
      MANIFEST_TTL
    );
  }

  async getStreams(type: string, id: string): Promise<ParsedStream[]> {
    const streams: StreamResponse = await this.makeResourceRequest(
      'stream',
      { type, id },
      StreamResponseSchema
    );
    const Parser = this.addon.fromPresetId
      ? PresetManager.fromId(this.addon.fromPresetId).getParser()
      : StreamParser;
    const parser = new Parser(this.addon);
    return streams.streams.map((stream: Stream) => parser.parse(stream));
  }

  async getCatalog(
    type: string,
    id: string,
    extras?: string
  ): Promise<MetaPreview[]> {
    const catalog: CatalogResponse = await this.makeResourceRequest(
      'catalog',
      { type, id, extras },
      CatalogResponseSchema,
      true
    );
    return catalog.metas;
  }

  async getMeta(type: string, id: string): Promise<Meta> {
    const meta: MetaResponse = await this.makeResourceRequest(
      'meta',
      { type, id },
      MetaResponseSchema,
      true
    );
    return meta.meta;
  }

  async getSubtitles(
    type: string,
    id: string,
    extras?: string
  ): Promise<Subtitle[]> {
    const subtitles: SubtitleResponse = await this.makeResourceRequest(
      'subtitles',
      { type, id, extras },
      SubtitleResponseSchema,
      true
    );
    return subtitles.subtitles;
  }

  async getAddonCatalog(type: string, id: string): Promise<AddonCatalog[]> {
    const addonCatalog: AddonCatalogResponse = await this.makeResourceRequest(
      'addon_catalog',
      { type, id },
      AddonCatalogResponseSchema
    );
    return addonCatalog.addons;
  }

  private async makeResourceRequest(
    resource: Resource,
    params: ResourceParams,
    schema: z.ZodSchema,
    cache: boolean = false
  ) {
    const { type, id, extras } = params;
    const url = this.buildResourceUrl(resource, type, id, extras);
    if (cache) {
      const cached = resourceCache.get(url);
      if (cached) {
        logger.debug(
          `Returning cached ${resource} for ${this.addon.name} (${makeUrlLogSafe(url)})`
        );
        return cached;
      }
    }
    logger.debug(
      `Fetching ${resource} of type ${type} with id ${id} and extras ${extras} (${makeUrlLogSafe(url)})`
    );
    try {
      const res = await makeRequest(
        url,
        this.addon.timeout,
        this.addon.headers,
        this.addon.ip
      );
      if (!res.ok) {
        logger.error(
          `Failed to fetch ${resource} resource for ${this.addon.name}: ${res.status} - ${res.statusText}`
        );

        throw new Error(`${res.status} - ${res.statusText}`);
      }
      const data = await res.json();
      const parsed = schema.safeParse(data);
      if (!parsed.success) {
        logger.error(`Resource response was unexpected`);
        logger.error(formatZodError(parsed.error));
        throw new Error(
          `Failed to parse ${resource} resource for ${this.addon.name}`
        );
      }
      if (cache) {
        resourceCache.set(url, parsed.data, RESOURCE_TTL);
      }
      return parsed.data;
    } catch (error: any) {
      logger.error(
        `Failed to fetch ${resource} resource for ${this.addon.name}: ${error.message}`
      );
      throw error;
    }
  }

  private buildResourceUrl(
    resource: Resource,
    type: string,
    id: string,
    extras?: string
  ): string {
    const extrasPath = extras ? `/${extras}` : '';
    return `${this.baseUrl}/${resource}/${type}/${encodeURIComponent(id)}${extrasPath}.json`;
  }
}
