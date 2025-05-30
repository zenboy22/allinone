import {
  Addon,
  AddonCatalog,
  AddonCatalogResponse,
  AddonCatalogResponseSchema,
  AddonCatalogSchema,
  CatalogResponse,
  CatalogResponseSchema,
  Manifest,
  ManifestSchema,
  Meta,
  MetaPreview,
  MetaPreviewSchema,
  MetaResponse,
  MetaResponseSchema,
  MetaSchema,
  ParsedStream,
  Resource,
  Stream,
  StreamResponse,
  StreamResponseSchema,
  StreamSchema,
  Subtitle,
  SubtitleResponse,
  SubtitleResponseSchema,
  SubtitleSchema,
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

  /**
   * Validates an array of items against a schema, filtering out invalid ones
   * @param data The data to validate
   * @param schema The Zod schema to validate against
   * @param resourceName Name of the resource for error messages
   * @returns Array of validated items
   * @throws Error if all items are invalid
   */
  private validateArray<T>(
    data: unknown,
    schema: z.ZodSchema<T>,
    resourceName: string
  ): T[] {
    if (!Array.isArray(data)) {
      throw new Error(`${resourceName} is not an array`);
    }

    const validItems = data
      .map((item) => {
        const parsed = schema.safeParse(item);
        if (!parsed.success) {
          logger.error(
            `An item in the response for ${resourceName} was invalid, filtering it out: ${formatZodError(parsed.error)}`
          );
          return null;
        }
        return parsed.data;
      })
      .filter((item): item is T => item !== null);

    if (validItems.length === 0) {
      throw new Error(`No valid ${resourceName} found`);
    }

    return validItems;
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
    const validator = (data: any): Stream[] => {
      return this.validateArray(data.streams, StreamSchema, 'streams');
    };

    const streams = await this.makeResourceRequest(
      'stream',
      { type, id },
      validator
    );
    const Parser = this.addon.fromPresetId
      ? PresetManager.fromId(this.addon.fromPresetId).getParser()
      : StreamParser;
    const parser = new Parser(this.addon);
    return streams.map((stream: Stream) => parser.parse(stream));
  }

  async getCatalog(
    type: string,
    id: string,
    extras?: string
  ): Promise<MetaPreview[]> {
    const validator = (data: any): MetaPreview[] => {
      return this.validateArray(data.metas, MetaPreviewSchema, 'catalog items');
    };

    return await this.makeResourceRequest(
      'catalog',
      { type, id, extras },
      validator,
      true
    );
  }

  async getMeta(type: string, id: string): Promise<Meta> {
    const validator = (data: any): Meta => {
      const parsed = MetaSchema.safeParse(data.meta);
      if (!parsed.success) {
        logger.error(formatZodError(parsed.error));
        throw new Error(`Failed to parse meta for ${this.addon.name}`);
      }
      return parsed.data;
    };
    const meta: Meta = await this.makeResourceRequest(
      'meta',
      { type, id },
      validator,
      true
    );
    return meta;
  }

  async getSubtitles(
    type: string,
    id: string,
    extras?: string
  ): Promise<Subtitle[]> {
    const validator = (data: any): Subtitle[] => {
      return this.validateArray(data.subtitles, SubtitleSchema, 'subtitles');
    };

    return await this.makeResourceRequest(
      'subtitles',
      { type, id, extras },
      validator,
      true
    );
  }

  async getAddonCatalog(type: string, id: string): Promise<AddonCatalog[]> {
    const validator = (data: any): AddonCatalog[] => {
      return this.validateArray(
        data.addons,
        AddonCatalogSchema,
        'addon catalog items'
      );
    };

    return await this.makeResourceRequest(
      'addon_catalog',
      { type, id },
      validator
    );
  }

  private async makeResourceRequest<T>(
    resource: Resource,
    params: ResourceParams,
    validator: (data: unknown) => T,
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
      const data: unknown = await res.json();

      const validated = validator(data);

      if (cache) {
        resourceCache.set(url, validated, RESOURCE_TTL);
      }
      return validated;
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
