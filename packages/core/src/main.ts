import {
  Addon,
  Manifest,
  Resource,
  StrictManifestResource,
  UserData,
} from './db';
import {
  constants,
  createErrorStream,
  createLogger,
  getTimeTakenSincePoint,
} from './utils';
import { Wrapper } from './wrapper';
import { PresetManager } from './presets';
import { AddonCatalog, ParsedStream, Stream, Subtitle } from './db/schemas';
import { createProxy } from './proxy';
import { createFormatter } from './formatters';
const logger = createLogger('core');

export class AIOStreams {
  private readonly userData: UserData;
  private manifests: Record<number, Manifest>;
  private supportedResources: Record<number, StrictManifestResource[]>;
  private finalResources: StrictManifestResource[] = [];
  private finalCatalogs: Manifest['catalogs'] = [];
  private finalAddonCatalogs: Manifest['addonCatalogs'] = [];
  private isInitialised: boolean = false;
  private addons: Addon[] = [];

  constructor(userData: UserData) {
    this.userData = userData;
    this.manifests = {};
    this.supportedResources = {};
  }

  public async initialise() {
    if (this.isInitialised) return;
    await this.applyPresets();
    await this.fetchManifests();
    await this.fetchResources();
    this.isInitialised = true;
  }

  private checkInitialised() {
    if (!this.isInitialised) {
      throw new Error(
        'AIOStreams is not initialised. Call initialise() first.'
      );
    }
  }

  public async getStreams(
    id: string,
    type: string
  ): Promise<{
    streams: ParsedStream[];
    errors: { addon: Addon; error: string }[];
  }> {
    logger.info(`Handling stream request`, { type, id });

    // step 1
    // get the public IP of the requesting user, using the proxy server if configured
    // if a proxy server is configured, and we fail to get the IP, return an error.
    // however, note that some addons may not be configured to use a proxy,
    // so we should attach an IP to each addon depending on if it would be using the proxy or not.

    this.assignPublicIps();

    // step 2
    // get all parsed stream objects and errors from all addons that have the stream resource.
    // and that support the type and match the id prefix

    const { streams, errors } = await this.getStreamsFromAddons(type, id);

    logger.info(
      `Received ${streams.length} streams and ${errors.length} errors`
    );

    // step 3
    // apply all filters to the streams.

    const filteredStreams = this.applyFilters(streams);

    // step 4
    // deduplicate streams based on the depuplicatoroptions

    const deduplicatedStreams = this.deduplicateStreams(filteredStreams);

    // step 5
    // sort the streams based on the sort criteria.

    const sortedStreams = this.sortStreams(deduplicatedStreams);

    // step 6
    // limit the number of streams based on the limit criteria.

    const limitedStreams = this.limitStreams(sortedStreams);

    // step 7
    // proxify streaming links if a proxy is provided

    const proxifiedStreams = await this.proxifyStreams(limitedStreams);

    // step 8
    // if this.userData.precacheNextEpisode is true, start a new thread to request the next episode, check if
    // all provider streams are uncached, and only if so, then send a request to the first uncached stream in the list.

    // step 9
    // return the final list of streams, followed by the error streams.
    logger.info(
      `Returning ${proxifiedStreams.length} streams and ${errors.length} errors`
    );
    return {
      streams: proxifiedStreams,
      errors: errors,
    };
  }

  public async transformStreams({
    streams,
    errors,
  }: {
    streams: ParsedStream[];
    errors: { addon: Addon; error: string }[];
  }): Promise<Stream[]> {
    let transformedStreams: Stream[] = [];
    // need to generate a name, description, and other stremio-specific fields
    // use the configured formatter to generate the name and description.
    let formatter;
    if (this.userData.formatter.id === constants.CUSTOM_FORMATTER) {
      const template = this.userData.formatter.definition;
      if (!template) {
        throw new Error('No template defined for custom formatter');
      }
      formatter = createFormatter(this.userData.formatter.id, template);
    } else {
      formatter = createFormatter(this.userData.formatter.id);
    }

    logger.info(
      `Transforming ${streams.length} streams, using formatter ${this.userData.formatter.id}`
    );

    transformedStreams = await Promise.all(
      streams.map(async (stream: ParsedStream): Promise<Stream> => {
        const { name, description } = formatter.format(stream);
        const bingeGroup = `${stream.proxied ? 'proxied.' : ''}${stream.parsedFile.resolution}|${stream.parsedFile.quality}|${stream.parsedFile.encode}`;
        return {
          name,
          description,
          url: ['http', 'usenet', 'debrid', 'live'].includes(stream.type)
            ? stream.url
            : undefined,
          infoHash:
            stream.type === 'p2p' ? stream.torrent?.infoHash : undefined,
          ytId: stream.type === 'youtube' ? stream.ytId : undefined,
          externalUrl:
            stream.type === 'external' ? stream.externalUrl : undefined,
          sources: stream.type === 'p2p' ? stream.torrent?.sources : undefined,
          subtitles: stream.subtitles,
          behaviorHints: {
            countryWhitelist: stream.countryWhitelist,
            notWebReady: stream.notWebReady,
            bingeGroup: bingeGroup,
            proxyHeaders:
              stream.requestHeaders || stream.responseHeaders
                ? {
                    request: stream.requestHeaders,
                    response: stream.responseHeaders,
                  }
                : undefined,
            videoHash: stream.videoHash,
            videoSize: stream.size,
            filename: stream.filename,
          },
        };
      })
    );

    // add errors to the end (if this.userData.hideErrors is false  )
    if (!this.userData.hideErrors) {
      transformedStreams.push(
        ...errors.map((error) =>
          createErrorStream({
            description: error.error,
            name: `[❌] ${error.addon.name}`,
          })
        )
      );
    }

    return transformedStreams;
  }

  public async getCatalog(type: string, id: string, extras?: string) {
    // step 1
    // get the addon index from the id
    logger.info(`Handling catalog request`, { type, id, extras });
    const start = Date.now();
    const addonIndex = id.split('.', 2)[0];
    const addon = this.getAddon(Number(addonIndex));
    if (!addon) {
      logger.error(`Addon ${addonIndex} not found`);
      throw new Error(`Addon ${addonIndex} not found`);
    }

    // step 2
    // get the actual catalog id from the id
    const actualCatalogId = id.split('.', 2)[1];
    // step 3
    // get the catalog from the addon
    const catalog = await new Wrapper(addon).getCatalog(
      type,
      actualCatalogId,
      extras
    );

    logger.info(
      `Received catalog ${actualCatalogId} of type ${type} from ${addon.name} in ${getTimeTakenSincePoint(start)}`
    );

    // step 4
    return catalog;
  }

  public async getMeta(type: string, id: string) {
    logger.info(`Handling meta request`, { type, id });
    // step 1
    // First try to find an addon that has a matching idPrefix
    for (const [index, resources] of Object.entries(this.supportedResources)) {
      const resource = resources.find(
        (r) =>
          r.name === 'meta' &&
          r.types.includes(type) &&
          r.idPrefixes?.some((prefix) => id.startsWith(prefix))
      );
      if (resource) {
        const addon = this.getAddon(Number(index));
        logger.info(`Found addon with matching id prefix for meta resource`, {
          addonName: addon.name,
          addonIndex: index,
        });
        return new Wrapper(addon).getMeta(type, id);
      }
    }

    // step 2
    // If no matching prefix found, use any addon that supports meta for this type
    for (const [index, resources] of Object.entries(this.supportedResources)) {
      const resource = resources.find(
        (r) => r.name === 'meta' && r.types.includes(type)
      );
      if (resource) {
        const addon = this.getAddon(Number(index));
        logger.info(`Using fallback addon for meta resource`, {
          addonName: addon.name,
          addonIndex: index,
        });
        return new Wrapper(addon).getMeta(type, id);
      }
    }

    logger.error(`No addon found supporting meta resource for type ${type}`);
    throw new Error(`No addon found supporting meta resource for type ${type}`);
  }

  // subtitle resource
  public async getSubtitles(type: string, id: string, extras?: string) {
    logger.info(`getSubtitles: ${id}`);

    // Find all addons that support subtitles for this type and id prefix
    const supportedAddons = [];
    for (const [addonIndex, addonResources] of Object.entries(
      this.supportedResources
    )) {
      const resource = addonResources.find((r) =>
        r.name === 'subtitles' && r.types.includes(type) && r.idPrefixes
          ? r.idPrefixes.some((prefix) => id.startsWith(prefix))
          : true
      );
      if (resource) {
        const addon = this.getAddon(Number(addonIndex));
        if (addon) {
          supportedAddons.push(addon);
        }
      }
    }

    // Request subtitles from all supported addons in parallel
    let errors: { addon: Addon; error: string }[] = [];
    let allSubtitles: Subtitle[] = [];

    await Promise.all(
      supportedAddons.map(async (addon) => {
        try {
          const subtitles = await new Wrapper(addon).getSubtitles(
            type,
            id,
            extras
          );
          if (subtitles) {
            allSubtitles.push(...subtitles);
          }
        } catch (error) {
          errors.push({
            addon: addon,
            error: error instanceof Error ? error.message : String(error),
          });
        }
      })
    );

    return {
      subtitles: allSubtitles,
      errors: errors,
    };
  }

  // addon_catalog resource
  public async getAddonCatalog(type: string, id: string) {
    logger.info(`getAddonCatalog: ${id}`);
    // step 1
    // get the addon index from the id
    const addonIndex = id.split('.', 2)[0];
    const addon = this.getAddon(Number(addonIndex));
    if (!addon) {
      throw new Error(`Addon ${addonIndex} not found`);
    }

    // step 2
    // get the actual addon catalog id from the id
    const actualAddonCatalogId = id.split('.', 2)[1];

    // step 3
    // get the addon catalog from the addon
    const addonCatalogs: AddonCatalog[] = await new Wrapper(
      addon
    ).getAddonCatalog(type, actualAddonCatalogId);

    // step 4
    return addonCatalogs;
  }
  // converts all addons to
  private async applyPresets() {
    if (!this.userData.presets) {
      return;
    }

    for (const preset of this.userData.presets.filter((p) => p.enabled)) {
      const addons = await PresetManager.fromId(preset.id).generateAddons(
        this.userData,
        preset.options
      );

      this.addons.push(...addons);
    }
  }

  private async fetchManifests() {
    this.manifests = Object.fromEntries(
      await Promise.all(
        this.addons.map(async (addon, index) => [
          index,
          await new Wrapper(addon).getManifest(),
        ])
      )
    );
  }

  private async fetchResources() {
    for (const [index, manifest] of Object.entries(this.manifests)) {
      if (!manifest) continue;

      // Convert string resources to StrictManifestResource objects
      const addonResources = manifest.resources.map((resource) => {
        if (typeof resource === 'string') {
          return {
            name: resource as Resource,
            types: manifest.types,
            idPrefixes: manifest.idPrefixes,
          };
        }
        return resource;
      });

      const addon = this.addons[Number(index)];

      // Filter and merge resources
      for (const resource of addonResources) {
        if (addon.resources && !addon.resources.includes(resource.name))
          continue;

        const existing = this.finalResources.find(
          (r) => r.name === resource.name
        );
        if (existing) {
          existing.types = [...new Set([...existing.types, ...resource.types])];
          if (resource.idPrefixes) {
            existing.idPrefixes = existing.idPrefixes || [];
            existing.idPrefixes = [
              ...new Set([...existing.idPrefixes, ...resource.idPrefixes]),
            ];
          }
        } else {
          this.finalResources.push({
            ...resource,
            idPrefixes: resource.idPrefixes
              ? [...resource.idPrefixes]
              : undefined,
          });
        }
      }

      // Add catalogs with prefixed IDs (ensure to check that if addon.resources is defined and does not have catalog
      // then we do not add the catalogs)

      if (
        !addon.resources ||
        (addon.resources && addon.resources.includes('catalog'))
      ) {
        this.finalCatalogs.push(
          ...manifest.catalogs.map((catalog) => ({
            ...catalog,
            id: `${index}.${catalog.id}`,
          }))
        );
      }

      // add all addon catalogs, prefixing id with index
      if (manifest.addonCatalogs) {
        this.finalAddonCatalogs!.push(
          ...(manifest.addonCatalogs || []).map((catalog) => ({
            ...catalog,
            id: `${index}.${catalog.id}`,
          }))
        );
      }

      this.supportedResources[Number(index)] = addonResources;
    }
  }

  public getResources(): StrictManifestResource[] {
    this.checkInitialised();
    return this.finalResources;
  }

  public getCatalogs(): Manifest['catalogs'] {
    this.checkInitialised();
    return this.finalCatalogs;
  }

  public getAddonCatalogs(): Manifest['addonCatalogs'] {
    this.checkInitialised();
    return this.finalAddonCatalogs;
  }

  private getAddon(index: number): Addon {
    return this.addons[index];
  }

  private shouldProxyAddon(addon: Addon): boolean {
    let proxyConfig = this.userData.proxy;
    if (!proxyConfig) {
      return false;
    }

    if (!proxyConfig.proxiedAddons) {
      return true;
    }

    if (proxyConfig.proxiedAddons.includes(addon.manifestUrl)) {
      return true;
    }

    if (
      addon.fromPresetId &&
      proxyConfig.proxiedAddons.includes(addon.fromPresetId)
    ) {
      return true;
    }

    return false;
  }

  private shouldProxyStream(stream: ParsedStream): boolean {
    const streamService = stream.service ? stream.service.id : 'none';
    const proxy = this.userData.proxy;
    if (!stream.url || !proxy?.enabled) {
      return false;
    }

    const proxyAddon =
      !proxy.proxiedAddons?.length ||
      proxy.proxiedAddons.includes(stream.addon.manifestUrl) ||
      (stream.addon.fromPresetId &&
        proxy.proxiedAddons.includes(stream.addon.fromPresetId));
    const proxyService =
      !proxy.proxiedServices?.length ||
      proxy.proxiedServices.includes(streamService);

    if (proxy.enabled && proxyAddon && proxyService) {
      return true;
    }

    return false;
  }

  private async getProxyIp() {
    let userIp = this.userData.ip;
    const PRIVATE_IP_REGEX =
      /^(::1|::ffff:(10|127|192|172)\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})|10\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})|127\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})|192\.168\.(\d{1,3})\.(\d{1,3})|172\.(1[6-9]|2[0-9]|3[0-1])\.(\d{1,3})\.(\d{1,3}))$/;

    if (userIp && PRIVATE_IP_REGEX.test(userIp)) {
      userIp = undefined;
    }
    if (!this.userData.proxy) {
      return userIp;
    }

    const proxy = createProxy(this.userData.proxy);
    if (proxy.getConfig().enabled) {
      userIp = await this.retryGetIp(
        () => proxy.getPublicIp(),
        'Proxy public IP'
      );
    }
    return userIp;
  }

  private async retryGetIp<T>(
    getter: () => Promise<T | null>,
    label: string,
    maxRetries: number = 3
  ): Promise<T> {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      const result = await getter();
      if (result) {
        return result;
      }
      logger.warn(
        `Failed to get ${label}, retrying... (${attempt}/${maxRetries})`
      );
    }
    throw new Error(`Failed to get ${label} after ${maxRetries} attempts`);
  }
  // stream utility functions
  private async assignPublicIps() {
    let userIp = this.userData.ip;
    let proxyIp = undefined;
    if (this.userData.proxy) {
      proxyIp = await this.getProxyIp();
    }
    for (const addon of this.addons) {
      const proxy = this.shouldProxyAddon(addon);
      if (proxy) {
        addon.ip = proxyIp;
      } else {
        addon.ip = userIp;
      }
    }
  }

  private async getStreamsFromAddons(type: string, id: string) {
    // get a list of all addons that support the stream resource with the given type and id.
    const supportedAddons = [];
    for (const [index, addonResources] of Object.entries(
      this.supportedResources
    )) {
      const resource = addonResources.find(
        (r) =>
          r.name === 'stream' && r.types.includes(type) && r.idPrefixes
            ? r.idPrefixes?.some((prefix) => id.startsWith(prefix))
            : true // if no id prefixes are defined, assume it supports all IDs
      );
      if (resource) {
        const addon = this.getAddon(Number(index));
        if (addon) {
          supportedAddons.push(addon);
        }
      }
    }

    logger.info(
      `Found ${supportedAddons.length} addons that support the stream resource`,
      {
        supportedAddons: supportedAddons.map((a) => a.name),
      }
    );

    // fetch all streams in parallel, maintaining a list of errors too,
    let errors: { addon: Addon; error: string }[] = [];
    let parsedStreams: ParsedStream[] = [];
    await Promise.all(
      supportedAddons.map(async (addon) => {
        let summaryMsg = '';

        try {
          const streams = await new Wrapper(addon).getStreams(type, id);
          parsedStreams.push(...streams);

          summaryMsg = `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  🟢 [${addon.name}] Scrape Summary
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  ✔ Status      : SUCCESS
  📦 Streams    : ${streams.length}
  📋 Details    : Successfully fetched streams.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`;
          return streams;
        } catch (error) {
          const errMsg = error instanceof Error ? error.message : String(error);
          errors.push({ addon, error: errMsg });
          summaryMsg = `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  🔴 [${addon.name}] Scrape Summary
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  ✖ Status      : FAILED
  🚫 Error      : ${errMsg}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    `;
          return [];
        } finally {
          logger.info(summaryMsg);
        }
      })
    );
    return { streams: parsedStreams, errors };
  }

  private applyFilters(streams: ParsedStream[]): ParsedStream[] {
    return streams;
  }

  private deduplicateStreams(streams: ParsedStream[]): ParsedStream[] {
    return streams;
  }

  private sortStreams(streams: ParsedStream[]): ParsedStream[] {
    return streams;
  }

  private limitStreams(streams: ParsedStream[]): ParsedStream[] {
    return streams;
  }

  private async proxifyStreams(
    streams: ParsedStream[]
  ): Promise<ParsedStream[]> {
    if (!this.userData.proxy?.enabled) {
      return streams;
    }

    const streamsToProxy = streams
      .map((stream, index) => ({ stream, index }))
      .filter(({ stream }) => stream.url && this.shouldProxyStream(stream));

    const proxy = createProxy(this.userData.proxy);

    const proxiedUrls = streamsToProxy.length
      ? await proxy.generateUrls(
          streamsToProxy.map(({ stream }) => ({
            url: stream.url!,
            filename: stream.filename,
            headers: {
              request: stream.requestHeaders,
              response: stream.responseHeaders,
            },
          }))
        )
      : [];

    const removeIndexes = new Set<number>();

    streamsToProxy.forEach(({ stream, index }, i) => {
      const proxiedUrl = proxiedUrls?.[i];
      if (proxiedUrl) {
        stream.url = proxiedUrl;
        stream.proxied = true;
      } else {
        removeIndexes.add(index);
      }
    });

    if (removeIndexes.size > 0) {
      streams = streams.filter((_, index) => !removeIndexes.has(index));
    }

    return streams;
  }
}
