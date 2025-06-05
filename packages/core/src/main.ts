import {
  Addon,
  Manifest,
  Resource,
  StrictManifestResource,
  UserData,
} from './db';
import {
  AUDIO_TAGS,
  constants,
  createErrorStream,
  createErrorSubtitle,
  createLogger,
  getTimeTakenSincePoint,
  StreamType,
  VISUAL_TAGS,
} from './utils';
import { Wrapper } from './wrapper';
import { PresetManager } from './presets';
import {
  AddonCatalog,
  ParsedStream,
  SortCriterion,
  Stream,
  Subtitle,
} from './db/schemas';
import { createProxy } from './proxy';
import { createFormatter } from './formatters';
import {
  compileRegex,
  formRegexFromKeywords,
  safeRegexTest,
} from './utils/regex';
import { isMatch } from 'super-regex';
import { ConditionParser } from './parser/conditions';
import { RPDB } from './utils/rpdb';
import { FeatureControl } from './utils/feature';
const logger = createLogger('core');

export class AIOStreams {
  private readonly userData: UserData;
  private manifests: Record<number, Manifest | null>;
  private supportedResources: Record<number, StrictManifestResource[]>;
  private finalResources: StrictManifestResource[] = [];
  private finalCatalogs: Manifest['catalogs'] = [];
  private finalAddonCatalogs: Manifest['addonCatalogs'] = [];
  private isInitialised: boolean = false;
  private addons: Addon[] = [];
  private skipFailedAddons: boolean = true;
  private addonInitialisationErrors: {
    addon: Addon;
    error: string;
  }[] = [];

  constructor(userData: UserData, skipFailedAddons: boolean = true) {
    this.addonInitialisationErrors = [];
    this.userData = userData;
    this.manifests = {};
    this.supportedResources = {};
    this.skipFailedAddons = skipFailedAddons;
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

    const filteredStreams = await this.applyFilters(streams, type);

    // step 4
    // deduplicate streams based on the depuplicatoroptions

    const deduplicatedStreams = this.deduplicateStreams(filteredStreams);

    // step 5
    // sort the streams based on the sort criteria.

    this.precomputeSortRegexes(deduplicatedStreams);

    const sortedStreams = this.sortStreams(deduplicatedStreams, type)
      // remove HDR+DV from visual tags after filtering/sorting
      .map((stream) => {
        if (stream.parsedFile?.visualTags?.includes('HDR+DV')) {
          stream.parsedFile.visualTags = stream.parsedFile.visualTags.filter(
            (tag) => tag !== 'HDR+DV'
          );
        }
        return stream;
      });

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
      formatter = createFormatter(
        this.userData.formatter.id,
        template,
        this.userData.addonName
      );
    } else {
      formatter = createFormatter(
        this.userData.formatter.id,
        undefined,
        this.userData.addonName
      );
    }

    logger.info(
      `Transforming ${streams.length} streams, using formatter ${this.userData.formatter.id}`
    );

    transformedStreams = await Promise.all(
      streams.map(async (stream: ParsedStream): Promise<Stream> => {
        const { name, description } = formatter.format(stream);
        const identifyingAttributes = [
          stream.parsedFile?.resolution,
          stream.parsedFile?.quality,
          stream.parsedFile?.encode,
          stream.parsedFile?.audioTags,
          stream.parsedFile?.visualTags,
          stream.parsedFile?.languages,
          stream.parsedFile?.releaseGroup,
          stream.indexer,
        ].filter(Boolean);
        const bingeGroup = `${stream.proxied ? 'proxied.' : ''}${identifyingAttributes.join('|')}`;
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

    // add errors to the end (if this.userData.hideErrors is false  or the resource is not in this.userData.hideErrorsForResources)
    if (
      !this.userData.hideErrors ||
      !this.userData.hideErrorsForResources?.includes('stream')
    ) {
      transformedStreams.push(
        ...errors.map((error) =>
          createErrorStream({
            description: error.error,
            name: `[❌] ${error.addon.identifyingName}`,
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
    let catalog = await new Wrapper(addon).getCatalog(
      type,
      actualCatalogId,
      extras
    );

    logger.info(
      `Received catalog ${actualCatalogId} of type ${type} from ${addon.name} in ${getTimeTakenSincePoint(start)}`
    );

    // apply catalog modifications
    if (this.userData.catalogModifications) {
      const modification = this.userData.catalogModifications.find(
        (mod) => mod.id === id && mod.type === type
      );
      if (modification) {
        if (modification.shuffle && !(extras && extras.includes('search'))) {
          // shuffle the catalog array  if it is not a search
          catalog = catalog.sort(() => Math.random() - 0.5);
        }
        if (modification.rpdb && this.userData.rpdbApiKey) {
          const rpdb = new RPDB(this.userData.rpdbApiKey);
          catalog = catalog.map((item) => {
            const posterUrl = rpdb.getPosterUrl(
              type,
              (item as any).imdb_id || item.id
            );
            if (posterUrl) {
              item.poster = posterUrl;
            }
            return item;
          });
        }
      }
    }

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
      const resource = addonResources.find(
        (r) =>
          r.name === 'subtitles' &&
          r.types.includes(type) &&
          (r.idPrefixes
            ? r.idPrefixes.some((prefix) => id.startsWith(prefix))
            : true)
      );
      if (resource) {
        const addon = this.getAddon(Number(addonIndex));
        if (addon) {
          supportedAddons.push(addon);
        }
      }
    }

    // Request subtitles from all supported addons in parallel
    let errors: { addon: Addon; error: string }[] =
      this.addonInitialisationErrors;
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

  public transformSubtitles({
    subtitles,
    errors,
  }: {
    subtitles: Subtitle[];
    errors: { addon: Addon; error: string }[];
  }): Subtitle[] {
    let transformedSubtitles: Subtitle[] = subtitles;
    if (
      errors.length > 0 &&
      (!this.userData.hideErrors ||
        !this.userData.hideErrorsForResources?.includes('subtitles'))
    ) {
      transformedSubtitles.push(
        ...errors.map((error) =>
          createErrorSubtitle({
            error: `${error.addon.identifyingName} - ${error.error}`,
          })
        )
      );
    }
    return transformedSubtitles;
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

      this.addons.push(
        ...addons.map((a) => ({
          ...a,
          id: JSON.stringify(preset),
        }))
      );
    }
  }

  private async fetchManifests() {
    this.manifests = Object.fromEntries(
      await Promise.all(
        this.addons.map(async (addon, index) => {
          try {
            return [index, await new Wrapper(addon).getManifest()];
          } catch (error: any) {
            if (this.skipFailedAddons) {
              this.addonInitialisationErrors.push({
                addon: addon,
                error: error.message,
              });
              logger.error(`${error.message}, skipping`);
              return [index, null];
            }
            throw error;
          }
        })
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
        if (
          addon.resources &&
          addon.resources.length > 0 &&
          !addon.resources.includes(resource.name)
        ) {
          continue;
        }

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
        !addon.resources?.length ||
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

    if (this.userData.catalogModifications) {
      this.finalCatalogs = this.finalCatalogs
        // Sort catalogs based on catalogModifications order, with non-modified catalogs at the end
        .sort((a, b) => {
          const aModIndex = this.userData.catalogModifications!.findIndex(
            (mod) => mod.id === a.id && mod.type === a.type
          );
          const bModIndex = this.userData.catalogModifications!.findIndex(
            (mod) => mod.id === b.id && mod.type === b.type
          );

          // If neither catalog is in modifications, maintain original order
          if (aModIndex === -1 && bModIndex === -1) {
            return (
              this.finalCatalogs.indexOf(a) - this.finalCatalogs.indexOf(b)
            );
          }

          // If only one catalog is in modifications, it should come first
          if (aModIndex === -1) return 1;
          if (bModIndex === -1) return -1;

          // If both are in modifications, sort by their order in modifications
          return aModIndex - bModIndex;
        })
        // filter out any catalogs that are disabled
        .filter((catalog) => {
          const modification = this.userData.catalogModifications!.find(
            (mod) => mod.id === catalog.id && mod.type === catalog.type
          );
          return modification?.enabled !== false; // only if explicity disabled i.e. enabled is true or undefined
        })
        // rename any catalogs if necessary
        .map((catalog) => {
          const modification = this.userData.catalogModifications!.find(
            (mod) => mod.id === catalog.id && mod.type === catalog.type
          );
          return modification?.name
            ? { ...catalog, name: modification.name }
            : catalog;
        });
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
      proxy.proxiedAddons.includes(stream.addon.id || '');
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
      try {
        const result = await getter();
        if (result) {
          return result;
        }
      } catch (error) {
        logger.warn(
          `Failed to get ${label}, retrying... (${attempt}/${maxRetries})`
        );
      }
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
          r.name === 'stream' &&
          r.types.includes(type) &&
          (r.idPrefixes
            ? r.idPrefixes?.some((prefix) => id.startsWith(prefix))
            : true) // if no id prefixes are defined, assume it supports all IDs
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

    let errors: { addon: Addon; error: string }[] =
      this.addonInitialisationErrors;
    let parsedStreams: ParsedStream[] = [];
    let totalTimeTaken = 0;
    let previousGroupStreams: ParsedStream[] = [];
    let previousGroupTimeTaken = 0;

    // Helper function to fetch streams from an addon and log summary
    const fetchFromAddon = async (addon: Addon) => {
      let summaryMsg = '';
      try {
        const start = Date.now();
        if (
          addon.fromPresetId &&
          FeatureControl.disabledAddons.has(addon.fromPresetId)
        ) {
          throw new Error(
            `Addon ${addon.identifyingName} is disabled: ${FeatureControl.disabledAddons.get(
              addon.fromPresetId
            )}`
          );
        } else if (
          FeatureControl.disabledHosts.has(new URL(addon.manifestUrl).host)
        ) {
          throw new Error(
            `Addon ${addon.identifyingName} is using a disabled host: ${FeatureControl.disabledHosts.get(
              new URL(addon.manifestUrl).host
            )}`
          );
        }
        const streams = await new Wrapper(addon).getStreams(type, id);
        parsedStreams.push(...streams);

        summaryMsg = `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  🟢 [${addon.identifyingName}] Scrape Summary
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  ✔ Status      : SUCCESS
  📦 Streams    : ${streams.length}
  📋 Details    : Successfully fetched streams.
  ⏱️ Time       : ${getTimeTakenSincePoint(start)}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`;
        return {
          success: true as const,
          streams,
          timeTaken: Date.now() - start,
        };
      } catch (error) {
        const errMsg = error instanceof Error ? error.message : String(error);
        errors.push({ addon, error: errMsg });
        summaryMsg = `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  🔴 [${addon.identifyingName}] Scrape Summary
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  ✖ Status      : FAILED
  🚫 Error      : ${errMsg}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`;
        return { success: false as const, error: errMsg, timeTaken: 0 };
      } finally {
        logger.info(summaryMsg);
      }
    };

    // Helper function to fetch from a group of addons and track time
    const fetchFromGroup = async (addons: Addon[]) => {
      const groupStart = Date.now();
      const results = await Promise.all(addons.map(fetchFromAddon));
      const groupTime = Date.now() - groupStart;
      return {
        results,
        totalTime: groupTime,
        streams: results.flatMap((r) =>
          r.success ? r.streams : []
        ) as ParsedStream[],
      };
    };

    // If groups are configured, handle group-based fetching
    if (this.userData.groups && this.userData.groups.length > 0) {
      // Always fetch from first group
      const firstGroupAddons = supportedAddons.filter(
        (addon) =>
          addon.id && this.userData.groups![0].addons.includes(addon.id)
      );

      logger.info(
        `Fetching streams from first group with ${firstGroupAddons.length} addons`
      );

      // Fetch streams from first group
      const firstGroupResult = await fetchFromGroup(firstGroupAddons);
      totalTimeTaken = firstGroupResult.totalTime;
      previousGroupStreams = firstGroupResult.streams;
      previousGroupTimeTaken = firstGroupResult.totalTime;

      // For each subsequent group, evaluate condition and fetch if true
      for (let i = 1; i < this.userData.groups.length; i++) {
        const group = this.userData.groups[i];

        // Skip if no condition or addons
        if (!group.condition || !group.addons.length) continue;

        try {
          const parser = new ConditionParser(
            previousGroupStreams,
            parsedStreams,
            previousGroupTimeTaken,
            totalTimeTaken
          );
          const shouldFetch = await parser.parse(group.condition);
          if (shouldFetch) {
            logger.info(`Condition met for group ${i + 1}, fetching streams`);

            const groupAddons = supportedAddons.filter(
              (addon) => addon.id && group.addons.includes(addon.id)
            );

            const groupResult = await fetchFromGroup(groupAddons);
            totalTimeTaken += groupResult.totalTime;
            previousGroupStreams = groupResult.streams;
            previousGroupTimeTaken = groupResult.totalTime;
          } else {
            logger.info(`Condition not met for group ${i}, skipping`);
          }
        } catch (error) {
          logger.error(`Error evaluating condition for group ${i}:`, error);
          continue;
        }
      }
    } else {
      // If no groups configured, fetch from all addons in parallel
      const result = await fetchFromGroup(supportedAddons);
      totalTimeTaken = result.totalTime;
    }

    return { streams: parsedStreams, errors };
  }

  private async applyFilters(
    streams: ParsedStream[],
    type: string
  ): Promise<ParsedStream[]> {
    interface SkipReason {
      total: number;
      details: Record<string, number>;
    }
    const skipReasons: Record<string, SkipReason> = {
      excludedStreamType: { total: 0, details: {} },
      requiredStreamType: { total: 0, details: {} },
      excludedResolution: { total: 0, details: {} },
      requiredResolution: { total: 0, details: {} },
      excludedQuality: { total: 0, details: {} },
      requiredQuality: { total: 0, details: {} },
      excludedEncode: { total: 0, details: {} },
      requiredEncode: { total: 0, details: {} },
      excludedVisualTag: { total: 0, details: {} },
      requiredVisualTag: { total: 0, details: {} },
      excludedAudioTag: { total: 0, details: {} },
      requiredAudioTag: { total: 0, details: {} },
      excludedLanguage: { total: 0, details: {} },
      requiredLanguage: { total: 0, details: {} },
      excludedUncached: { total: 0, details: {} },
      requiredUncached: { total: 0, details: {} },
      excludedRegex: { total: 0, details: {} },
      requiredRegex: { total: 0, details: {} },
      excludedKeywords: { total: 0, details: {} },
      requiredKeywords: { total: 0, details: {} },
      requiredSeeders: { total: 0, details: {} },
      excludedSeeders: { total: 0, details: {} },
    };

    const start = Date.now();
    const isRegexAllowed = FeatureControl.isRegexAllowed(this.userData);

    const excludedRegexPatterns =
      isRegexAllowed && this.userData.excludedRegexPatterns
        ? await Promise.all(
            this.userData.excludedRegexPatterns.map(async (pattern) =>
              compileRegex(pattern)
            )
          )
        : undefined;

    const requiredRegexPatterns =
      isRegexAllowed && this.userData.requiredRegexPatterns
        ? await Promise.all(
            this.userData.requiredRegexPatterns.map(async (pattern) =>
              compileRegex(pattern)
            )
          )
        : undefined;

    const includedRegexPatterns =
      isRegexAllowed && this.userData.includedRegexPatterns
        ? await Promise.all(
            this.userData.includedRegexPatterns.map(async (pattern) =>
              compileRegex(pattern)
            )
          )
        : undefined;

    const excludedKeywordsPattern = this.userData.excludedKeywords
      ? await formRegexFromKeywords(this.userData.excludedKeywords)
      : undefined;

    const requiredKeywordsPattern = this.userData.requiredKeywords
      ? await formRegexFromKeywords(this.userData.requiredKeywords)
      : undefined;

    const includedKeywordsPattern = this.userData.includedKeywords
      ? await formRegexFromKeywords(this.userData.includedKeywords)
      : undefined;

    // test many regexes against many attributes and return true if at least one regex matches any attribute
    // and false if no regex matches any attribute
    const testRegexes = async (stream: ParsedStream, patterns: RegExp[]) => {
      const file = stream.parsedFile;
      const stringsToTest = [
        stream.filename,
        file?.releaseGroup,
        stream.indexer,
        stream.folderName,
      ].filter((v) => v !== undefined);

      for (const string of stringsToTest) {
        for (const pattern of patterns) {
          if (await safeRegexTest(pattern, string)) {
            return true;
          }
        }
      }
      return false;
    };

    const filterBasedOnCacheStatus = (
      stream: ParsedStream,
      mode: 'and' | 'or',
      addonIds: string[] | undefined,
      serviceIds: string[] | undefined,
      cached: boolean
    ) => {
      const addonCriteriaMet =
        !addonIds ||
        addonIds.length === 0 ||
        (addonIds.some((addonId) => stream.addon.id === addonId) &&
          stream.service?.cached === cached);
      const serviceCriteriaMet =
        !serviceIds ||
        serviceIds.length === 0 ||
        (serviceIds.some((serviceId) => stream.service?.id === serviceId) &&
          stream.service?.cached === cached);

      if (mode === 'and') {
        return addonCriteriaMet && serviceCriteriaMet;
      } else {
        return addonCriteriaMet || serviceCriteriaMet;
      }
    };

    const shouldKeepStream = async (stream: ParsedStream): Promise<boolean> => {
      const file = stream.parsedFile;

      // carry out include checks first
      if (this.userData.includedStreamTypes?.includes(stream.type)) {
        return true;
      }

      if (
        this.userData.includedResolutions?.includes(
          file?.resolution || ('Unknown' as any)
        )
      ) {
        return true;
      }

      if (
        this.userData.includedQualities?.includes(
          file?.quality || ('Unknown' as any)
        )
      ) {
        return true;
      }

      if (
        this.userData.includedVisualTags?.some((tag) =>
          file?.visualTags.includes(tag)
        )
      ) {
        return true;
      }

      if (
        this.userData.includedAudioTags?.some((tag) =>
          file?.audioTags.includes(tag)
        )
      ) {
        return true;
      }

      if (
        this.userData.includedLanguages?.some((lang) =>
          (file?.languages || ['Unknown']).includes(lang)
        )
      ) {
        return true;
      }

      if (
        this.userData.includedEncodes?.some((encode) => file?.encode === encode)
      ) {
        return true;
      }

      if (
        includedRegexPatterns &&
        (await testRegexes(stream, includedRegexPatterns))
      ) {
        return true;
      }

      if (
        includedKeywordsPattern &&
        (await testRegexes(stream, [includedKeywordsPattern]))
      ) {
        return true;
      }

      if (
        this.userData.includedSeeders?.min &&
        stream.torrent?.seeders &&
        stream.torrent.seeders > this.userData.includedSeeders.min
      ) {
        return true;
      }
      if (
        this.userData.includedSeeders?.max &&
        stream.torrent?.seeders &&
        stream.torrent.seeders < this.userData.includedSeeders.max
      ) {
        return true;
      }

      // Track stream type exclusions
      if (this.userData.excludedStreamTypes?.includes(stream.type)) {
        skipReasons.excludedStreamType.total++;
        skipReasons.excludedStreamType.details[stream.type] =
          (skipReasons.excludedStreamType.details[stream.type] || 0) + 1;
        return false;
      }

      // Track required stream type misses
      if (
        this.userData.requiredStreamTypes &&
        this.userData.requiredStreamTypes.length > 0 &&
        !this.userData.requiredStreamTypes.includes(stream.type)
      ) {
        skipReasons.requiredStreamType.total++;
        skipReasons.requiredStreamType.details[stream.type] =
          (skipReasons.requiredStreamType.details[stream.type] || 0) + 1;
        return false;
      }

      // Resolutions
      if (
        this.userData.excludedResolutions?.includes(
          (file?.resolution || 'Unknown') as any
        )
      ) {
        skipReasons.excludedResolution.total++;
        skipReasons.excludedResolution.details[file?.resolution || 'Unknown'] =
          (skipReasons.excludedResolution.details[
            file?.resolution || 'Unknown'
          ] || 0) + 1;
        return false;
      }

      if (
        this.userData.requiredResolutions &&
        this.userData.requiredResolutions.length > 0 &&
        !this.userData.requiredResolutions.includes(
          (file?.resolution || 'Unknown') as any
        )
      ) {
        skipReasons.requiredResolution.total++;
        skipReasons.requiredResolution.details[file?.resolution || 'Unknown'] =
          (skipReasons.requiredResolution.details[
            file?.resolution || 'Unknown'
          ] || 0) + 1;
        return false;
      }

      // Qualities
      if (
        this.userData.excludedQualities?.includes(
          (file?.quality || 'Unknown') as any
        )
      ) {
        skipReasons.excludedQuality.total++;
        skipReasons.excludedQuality.details[file?.quality || 'Unknown'] =
          (skipReasons.excludedQuality.details[file?.quality || 'Unknown'] ||
            0) + 1;
        return false;
      }

      if (
        this.userData.requiredQualities &&
        this.userData.requiredQualities.length > 0 &&
        !this.userData.requiredQualities.includes(
          (file?.quality || 'Unknown') as any
        )
      ) {
        skipReasons.requiredQuality.total++;
        skipReasons.requiredQuality.details[file?.quality || 'Unknown'] =
          (skipReasons.requiredQuality.details[file?.quality || 'Unknown'] ||
            0) + 1;
        return false;
      }

      // encode
      if (
        this.userData.excludedEncodes?.includes(
          file?.encode || ('Unknown' as any)
        )
      ) {
        skipReasons.excludedEncode.total++;
        skipReasons.excludedEncode.details[file?.encode || 'Unknown'] =
          (skipReasons.excludedEncode.details[file?.encode || 'Unknown'] || 0) +
          1;
        return false;
      }

      if (
        this.userData.requiredEncodes &&
        this.userData.requiredEncodes.length > 0 &&
        !this.userData.requiredEncodes.includes(
          file?.encode || ('Unknown' as any)
        )
      ) {
        skipReasons.requiredEncode.total++;
        skipReasons.requiredEncode.details[file?.encode || 'Unknown'] =
          (skipReasons.requiredEncode.details[file?.encode || 'Unknown'] || 0) +
          1;
        return false;
      }

      // temporarily add HDR+DV to visual tags list if both HDR and DV are present
      // to allow HDR+DV option in userData to work
      if (
        file?.visualTags?.some((tag) => tag.startsWith('HDR')) &&
        file?.visualTags?.some((tag) => tag.startsWith('DV'))
      ) {
        const hdrIndex = file?.visualTags?.findIndex((tag) =>
          tag.startsWith('HDR')
        );
        const dvIndex = file?.visualTags?.findIndex((tag) =>
          tag.startsWith('DV')
        );
        const insertIndex = Math.min(hdrIndex, dvIndex);
        file?.visualTags?.splice(insertIndex, 0, 'HDR+DV');
      }

      if (
        this.userData.excludedVisualTags?.some((tag) =>
          file?.visualTags?.includes(tag)
        )
      ) {
        const tag = this.userData.excludedVisualTags.find((tag) =>
          file?.visualTags?.includes(tag)
        );
        skipReasons.excludedVisualTag.total++;
        skipReasons.excludedVisualTag.details[tag!] =
          (skipReasons.excludedVisualTag.details[tag!] || 0) + 1;
        return false;
      }

      if (
        this.userData.requiredVisualTags &&
        this.userData.requiredVisualTags.length > 0 &&
        !this.userData.requiredVisualTags.some((tag) =>
          file?.visualTags?.includes(tag)
        )
      ) {
        const tag = this.userData.requiredVisualTags.find((tag) =>
          file?.visualTags?.includes(tag)
        );
        skipReasons.requiredVisualTag.total++;
        skipReasons.requiredVisualTag.details[tag!] =
          (skipReasons.requiredVisualTag.details[tag!] || 0) + 1;
        return false;
      }

      if (
        this.userData.excludedAudioTags?.some((tag) =>
          file?.audioTags.includes(tag)
        )
      ) {
        const tag = this.userData.excludedAudioTags.find((tag) =>
          file?.audioTags.includes(tag)
        );
        skipReasons.excludedAudioTag.total++;
        skipReasons.excludedAudioTag.details[tag!] =
          (skipReasons.excludedAudioTag.details[tag!] || 0) + 1;
        return false;
      }

      if (
        this.userData.requiredAudioTags &&
        this.userData.requiredAudioTags.length > 0 &&
        !this.userData.requiredAudioTags.some((tag) =>
          file?.audioTags.includes(tag)
        )
      ) {
        const tag = this.userData.requiredAudioTags.find((tag) =>
          file?.audioTags.includes(tag)
        );
        skipReasons.requiredAudioTag.total++;
        skipReasons.requiredAudioTag.details[tag!] =
          (skipReasons.requiredAudioTag.details[tag!] || 0) + 1;
        return false;
      }

      // languages
      if (
        this.userData.excludedLanguages?.some((lang) =>
          file?.languages.includes(lang)
        )
      ) {
        const lang = this.userData.excludedLanguages.find((lang) =>
          file?.languages.includes(lang)
        );
        skipReasons.excludedLanguage.total++;
        skipReasons.excludedLanguage.details[lang!] =
          (skipReasons.excludedLanguage.details[lang!] || 0) + 1;
        return false;
      }

      if (
        this.userData.requiredLanguages &&
        this.userData.requiredLanguages.length > 0 &&
        !this.userData.requiredLanguages.some((lang) =>
          (file?.languages || ['Unknown']).includes(lang)
        )
      ) {
        const lang = this.userData.requiredLanguages.find((lang) =>
          (file?.languages || ['Unknown']).includes(lang)
        );
        skipReasons.requiredLanguage.total++;
        skipReasons.requiredLanguage.details[lang!] =
          (skipReasons.requiredLanguage.details[lang!] || 0) + 1;
        return false;
      }

      // uncached

      if (this.userData.excludeUncached && stream.service?.cached === false) {
        skipReasons.excludedUncached.total++;
        return false;
      }

      if (this.userData.excludeCached && stream.service?.cached === true) {
        skipReasons.excludedCached.total++;
        return false;
      }

      // uncached/cached from services/addons
      // have to respect the excludeCachedMode/excludeUncachedMode

      // create a common function to handle this

      if (
        filterBasedOnCacheStatus(
          stream,
          this.userData.excludeCachedMode || 'or',
          this.userData.excludeCachedFromAddons,
          this.userData.excludeCachedFromServices,
          true
        ) === false
      ) {
        skipReasons.excludedCached.total++;
        return false;
      }

      if (
        filterBasedOnCacheStatus(
          stream,
          this.userData.excludeUncachedMode || 'or',
          this.userData.excludeUncachedFromAddons,
          this.userData.excludeUncachedFromServices,
          false
        ) === false
      ) {
        skipReasons.excludedUncached.total++;
        return false;
      }

      if (
        excludedRegexPatterns &&
        (await testRegexes(stream, excludedRegexPatterns))
      ) {
        skipReasons.excludedRegex.total++;
        return false;
      }
      if (
        requiredRegexPatterns &&
        !(await testRegexes(stream, requiredRegexPatterns))
      ) {
        skipReasons.requiredRegex.total++;
        return false;
      }

      if (
        excludedKeywordsPattern &&
        (await testRegexes(stream, [excludedKeywordsPattern]))
      ) {
        skipReasons.excludedKeywords.total++;
        return false;
      }

      if (
        requiredKeywordsPattern &&
        !(await testRegexes(stream, [requiredKeywordsPattern]))
      ) {
        skipReasons.requiredKeywords.total++;
        return false;
      }

      if (
        this.userData.requiredSeeders?.min &&
        stream.torrent?.seeders &&
        stream.torrent.seeders < this.userData.requiredSeeders.min
      ) {
        skipReasons.requiredSeeders.total++;
        return false;
      }
      if (
        this.userData.requiredSeeders?.max &&
        stream.torrent?.seeders &&
        stream.torrent.seeders > this.userData.requiredSeeders.max
      ) {
        skipReasons.requiredSeeders.total++;
        return false;
      }

      if (
        this.userData.excludedSeeders?.min &&
        stream.torrent?.seeders &&
        stream.torrent.seeders < this.userData.excludedSeeders.min
      ) {
        skipReasons.excludedSeeders.total++;
        return false;
      }
      if (
        this.userData.excludedSeeders?.max &&
        stream.torrent?.seeders &&
        stream.torrent.seeders > this.userData.excludedSeeders.max
      ) {
        skipReasons.excludedSeeders.total++;
        return false;
      }

      // TODO: size filters

      return true;
    };

    const filterResults = await Promise.all(streams.map(shouldKeepStream));
    const filteredStreams = streams.filter((_, index) => filterResults[index]);

    // Log filter summary
    const totalFiltered = streams.length - filteredStreams.length;
    if (totalFiltered > 0) {
      const summary = [
        '\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
        `  🔍 Filter Summary`,
        '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
        `  📊 Total Streams : ${streams.length}`,
        `  ✔️ Kept         : ${filteredStreams.length}`,
        `  ❌ Filtered     : ${totalFiltered}`,
      ];

      // Add filter details if any streams were filtered
      const filterDetails: string[] = [];
      for (const [reason, stats] of Object.entries(skipReasons)) {
        if (stats.total > 0) {
          // Convert camelCase to Title Case with spaces
          const formattedReason = reason
            .replace(/([A-Z])/g, ' $1')
            .replace(/^./, (str) => str.toUpperCase());

          filterDetails.push(`\n  📌 ${formattedReason} (${stats.total})`);
          for (const [detail, count] of Object.entries(stats.details)) {
            filterDetails.push(`    • ${count}× ${detail}`);
          }
        }
      }

      if (filterDetails.length > 0) {
        summary.push('\n  🔎 Filter Details:');
        summary.push(...filterDetails);
      }

      summary.push('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      logger.info(summary.join('\n'));
    }

    logger.info(`Applied filters in ${getTimeTakenSincePoint(start)}`);
    return filteredStreams;
  }

  private deduplicateStreams(streams: ParsedStream[]): ParsedStream[] {
    let deduplicator = this.userData.deduplicator;
    if (!deduplicator || !deduplicator.enabled) {
      return streams;
    }
    const start = Date.now();

    const deduplicationKeys = deduplicator.keys || ['filename', 'infoHash'];

    deduplicator = {
      enabled: true,
      keys: deduplicationKeys,
      cached: deduplicator.cached || 'per_addon',
      uncached: deduplicator.uncached || 'per_addon',
      p2p: deduplicator.p2p || 'per_addon',
      http: deduplicator.http || 'disabled',
      live: deduplicator.live || 'disabled',
      youtube: deduplicator.youtube || 'disabled',
      external: deduplicator.external || 'disabled',
    };

    // Group streams by their deduplication keys
    const streamGroups = new Map<string, ParsedStream[]>();

    for (const stream of streams) {
      // Create a unique key based on the selected deduplication methods
      const keys: string[] = [];

      if (deduplicationKeys.includes('filename') && stream.filename) {
        let normalisedFilename = stream.filename
          .replace(
            /\.(mkv|mp4|avi|mov|wmv|flv|webm|m4v|mpg|mpeg|3gp|3g2|m2ts|ts|vob|ogv|ogm|divx|xvid|rm|rmvb|asf|mxf|mka|mks|mk3d|webm|f4v|f4p|f4a|f4b)$/i,
            ''
          )
          .replace(/[^\p{L}\p{N}+]/gu, '')
          .replace(/\s+/g, '')
          .toLowerCase();
        keys.push(`filename:${normalisedFilename}`);
      }

      if (deduplicationKeys.includes('infoHash') && stream.torrent?.infoHash) {
        keys.push(`infoHash:${stream.torrent.infoHash}`);
      }

      // If no keys match, keep the stream
      if (keys.length === 0) {
        streamGroups.set(`unique_${Math.random()}`, [stream]);
        continue;
      }

      // Add stream to all matching key groups
      for (const key of keys) {
        const group = streamGroups.get(key) || [];
        group.push(stream);
        streamGroups.set(key, group);
      }
    }

    // Process each group based on stream types and deduplication modes
    const processedStreams = new Set<ParsedStream>();

    for (const group of streamGroups.values()) {
      // Group streams by type
      const streamsByType = new Map<string, ParsedStream[]>();
      for (const stream of group) {
        let type = stream.type as string;
        if (type === 'debrid' && stream.service) {
          type = stream.service.cached ? 'cached' : 'uncached';
        } else if (type === 'usenet' && stream.service) {
          type = 'cached';
        }
        const typeGroup = streamsByType.get(type) || [];
        typeGroup.push(stream);
        streamsByType.set(type, typeGroup);
      }

      // Process each type according to its deduplication mode
      for (const [type, typeStreams] of streamsByType.entries()) {
        const mode = deduplicator[type as keyof typeof deduplicator] as string;
        if (mode === 'disabled') {
          typeStreams.forEach((stream) => processedStreams.add(stream));
          continue;
        }

        switch (mode) {
          case 'single_result':
            // Keep one result with highest priority service and addon
            let selectedStream = typeStreams.sort((a, b) => {
              // so a specific type may either have both streams not have a service, or both streams have a service
              // if both streams have a service, then we can simpl
              const aProviderIndex =
                this.userData.services?.findIndex(
                  (service) => service.id === a.service?.id
                ) ?? -1;
              const bProviderIndex =
                this.userData.services?.findIndex(
                  (service) => service.id === b.service?.id
                ) ?? -1;

              if (
                aProviderIndex &&
                bProviderIndex &&
                aProviderIndex !== bProviderIndex
              ) {
                return aProviderIndex - bProviderIndex;
              }

              // look at seeders for p2p and uncached streams
              if (
                (type === 'p2p' || type === 'uncached') &&
                a.torrent?.seeders &&
                b.torrent?.seeders
              ) {
                return (b.torrent.seeders || 0) - (a.torrent.seeders || 0);
              }

              // now look at the addon index

              const aAddonIndex =
                this.userData.presets.findIndex(
                  (preset) => JSON.stringify(preset) === a.addon.id
                ) ?? -1;
              const bAddonIndex =
                this.userData.presets.findIndex(
                  (preset) => JSON.stringify(preset) === b.addon.id
                ) ?? -1;

              // the addon index MUST exist, its not possible for it to not exist
              if (aAddonIndex !== bAddonIndex) {
                return aAddonIndex - bAddonIndex;
              }

              // now look at stream type
              const aTypeIndex =
                this.userData.preferredStreamTypes?.findIndex(
                  (type) => type === a.type
                ) ?? 0;
              const bTypeIndex =
                this.userData.preferredStreamTypes?.findIndex(
                  (type) => type === b.type
                ) ?? 0;

              if (aTypeIndex !== bTypeIndex) {
                return aTypeIndex - bTypeIndex;
              }

              return 0;
            })[0];
            processedStreams.add(selectedStream);
            break;

          case 'per_service':
            // Keep one result from each service (highest priority available addon for that service)
            // first, ensure that all streams have a service, otherwise we can't use this mode
            if (typeStreams.some((stream) => !stream.service)) {
              throw new Error(
                'per_service mode requires all streams to have a service'
              );
            }
            let perServiceStreams = Object.values(
              typeStreams.reduce(
                (acc, stream) => {
                  acc[stream.service!.id] = acc[stream.service!.id] || [];
                  acc[stream.service!.id].push(stream);
                  return acc;
                },
                {} as Record<string, ParsedStream[]>
              )
            ).map((serviceStreams) => {
              return serviceStreams.sort((a, b) => {
                const aAddonIndex =
                  this.userData.presets.findIndex(
                    (preset) => JSON.stringify(preset) === a.addon.id
                  ) ?? -1;
                const bAddonIndex =
                  this.userData.presets.findIndex(
                    (preset) => JSON.stringify(preset) === b.addon.id
                  ) ?? -1;
                if (aAddonIndex !== bAddonIndex) {
                  return aAddonIndex - bAddonIndex;
                }

                // now look at stream type
                const aTypeIndex =
                  this.userData.preferredStreamTypes?.findIndex(
                    (type) => type === a.type
                  ) ?? 0;
                const bTypeIndex =
                  this.userData.preferredStreamTypes?.findIndex(
                    (type) => type === b.type
                  ) ?? 0;
                if (aTypeIndex !== bTypeIndex) {
                  return aTypeIndex - bTypeIndex;
                }

                // look at seeders for p2p and uncached streams
                if (type === 'p2p' || type === 'uncached') {
                  return (b.torrent?.seeders || 0) - (a.torrent?.seeders || 0);
                }
                return 0;
              })[0];
            });
            for (const stream of perServiceStreams) {
              processedStreams.add(stream);
            }
            break;

          case 'per_addon':
            if (typeStreams.some((stream) => !stream.addon)) {
              throw new Error(
                'per_addon mode requires all streams to have an addon'
              );
            }
            let perAddonStreams = Object.values(
              typeStreams.reduce(
                (acc, stream) => {
                  acc[stream.addon.id!] = acc[stream.addon.id!] || [];
                  acc[stream.addon.id!].push(stream);
                  return acc;
                },
                {} as Record<string, ParsedStream[]>
              )
            ).map((addonStreams) => {
              return addonStreams.sort((a, b) => {
                const aServiceIndex =
                  this.userData.services?.findIndex(
                    (service) => service.id === a.service?.id
                  ) ?? -1;
                const bServiceIndex =
                  this.userData.services?.findIndex(
                    (service) => service.id === b.service?.id
                  ) ?? -1;
                if (aServiceIndex !== bServiceIndex) {
                  return aServiceIndex - bServiceIndex;
                }

                // look at seeders for p2p and uncached streams
                if (type === 'p2p' || type === 'uncached') {
                  return (b.torrent?.seeders || 0) - (a.torrent?.seeders || 0);
                }
                return 0;
              })[0];
            });
            for (const stream of perAddonStreams) {
              processedStreams.add(stream);
            }
            break;
        }
      }
    }

    let deduplicatedStreams = Array.from(processedStreams);
    logger.info(
      `Filtered out ${streams.length - deduplicatedStreams.length} duplicate streams to ${deduplicatedStreams.length} streams in ${getTimeTakenSincePoint(start)}`
    );
    return deduplicatedStreams;
  }

  private async precomputeSortRegexes(streams: ParsedStream[]) {
    const preferredRegexPatterns =
      FeatureControl.isRegexAllowed(this.userData) &&
      this.userData.preferredRegexPatterns
        ? await Promise.all(
            this.userData.preferredRegexPatterns.map(async (pattern) => {
              return {
                name: pattern.name,
                pattern: await compileRegex(pattern.pattern),
              };
            })
          )
        : undefined;
    const preferredKeywordsPatterns = this.userData.preferredKeywords
      ? await formRegexFromKeywords(this.userData.preferredKeywords)
      : undefined;
    if (!preferredRegexPatterns && !preferredKeywordsPatterns) {
      return;
    }
    const start = Date.now();
    if (preferredKeywordsPatterns) {
      streams.forEach((stream) => {
        stream.keywordMatched =
          isMatch(preferredKeywordsPatterns, stream.filename || '') ||
          isMatch(preferredKeywordsPatterns, stream.folderName || '') ||
          isMatch(
            preferredKeywordsPatterns,
            stream.parsedFile?.releaseGroup || ''
          ) ||
          isMatch(preferredKeywordsPatterns, stream.indexer || '');
      });
    }
    if (preferredRegexPatterns) {
      streams.forEach((stream) => {
        for (let i = 0; i < preferredRegexPatterns.length; i++) {
          const regexPattern = preferredRegexPatterns[i];
          if (
            regexPattern &&
            !stream.regexMatched &&
            ((stream.filename &&
              isMatch(regexPattern.pattern, stream.filename)) ||
              (stream.folderName &&
                isMatch(regexPattern.pattern, stream.folderName)) ||
              (stream.parsedFile?.releaseGroup &&
                isMatch(
                  regexPattern.pattern,
                  stream.parsedFile?.releaseGroup || ''
                )) ||
              (stream.indexer && isMatch(regexPattern.pattern, stream.indexer)))
          ) {
            stream.regexMatched = {
              name: regexPattern.name,
              pattern: regexPattern.pattern.source,
              index: i,
            };
            break;
          }
        }
      });
    }
    logger.info(`Precomputed sort regexes in ${getTimeTakenSincePoint(start)}`);
  }

  private sortStreams(streams: ParsedStream[], type: string): ParsedStream[] {
    let sortCriteria = this.userData.sortCriteria.global;
    let cachedSortCriteria = this.userData.sortCriteria.cached;
    let uncachedSortCriteria = this.userData.sortCriteria.uncached;

    const start = Date.now();

    if (type === 'movie' && this.userData.sortCriteria?.movies?.length) {
      logger.info('Using movie sort criteria');
      sortCriteria = this.userData.sortCriteria?.movies;
      cachedSortCriteria = this.userData.sortCriteria?.cachedMovies;
      uncachedSortCriteria = this.userData.sortCriteria?.uncachedMovies;
    }

    if (type === 'series' && this.userData.sortCriteria?.series?.length) {
      logger.info('Using series sort criteria');
      sortCriteria = this.userData.sortCriteria?.series;
      cachedSortCriteria = this.userData.sortCriteria?.cachedSeries;
      uncachedSortCriteria = this.userData.sortCriteria?.uncachedSeries;
    }
    let sortedStreams = [];

    if (
      cachedSortCriteria?.length &&
      uncachedSortCriteria?.length &&
      sortCriteria.length > 0 &&
      sortCriteria[0].key === 'cached'
    ) {
      logger.info(
        'Splitting streams into cached and uncached and using separate sort criteria'
      );
      const cachedStreams = streams.filter(
        (stream) => stream.service?.cached || stream.service === undefined // streams without a service can be considered as 'cached'
      );
      const uncachedStreams = streams.filter(
        (stream) => stream.service?.cached === false
      );

      // sort the 2 lists separately, and put them after the other, depending on the direction of cached
      const cachedSorted = cachedStreams.slice().sort((a, b) => {
        const aKey = this.dynamicSortKey(a, cachedSortCriteria, type);
        const bKey = this.dynamicSortKey(b, cachedSortCriteria, type);
        for (let i = 0; i < aKey.length; i++) {
          if (aKey[i] < bKey[i]) return -1;
          if (aKey[i] > bKey[i]) return 1;
        }
        return 0;
      });

      const uncachedSorted = uncachedStreams.slice().sort((a, b) => {
        const aKey = this.dynamicSortKey(a, uncachedSortCriteria, type);
        const bKey = this.dynamicSortKey(b, uncachedSortCriteria, type);
        for (let i = 0; i < aKey.length; i++) {
          if (aKey[i] < bKey[i]) return -1;
          if (aKey[i] > bKey[i]) return 1;
        }
        return 0;
      });

      if (sortCriteria[0].direction === 'desc') {
        sortedStreams = [...cachedSorted, ...uncachedSorted];
      } else {
        sortedStreams = [...uncachedSorted, ...cachedSorted];
      }
    } else {
      logger.debug(`using sort criteria: ${JSON.stringify(sortCriteria)}`);
      sortedStreams = streams.slice().sort((a, b) => {
        const aKey = this.dynamicSortKey(a, sortCriteria, type);
        const bKey = this.dynamicSortKey(b, sortCriteria, type);

        for (let i = 0; i < aKey.length; i++) {
          if (aKey[i] < bKey[i]) return -1;
          if (aKey[i] > bKey[i]) return 1;
        }
        return 0;
      });
    }

    logger.info(
      `Sorted ${sortedStreams.length} streams in ${getTimeTakenSincePoint(start)}`
    );
    return sortedStreams;
  }

  private dynamicSortKey(
    stream: ParsedStream,
    sortCriteria: SortCriterion[],
    type: string
  ): any[] {
    function keyValue(sortCriterion: SortCriterion, userData: UserData) {
      const { key, direction } = sortCriterion;
      const multiplier = direction === 'asc' ? 1 : -1;
      // "quality" | "resolution" | "language" | "visualTag" | "audioTag" | "streamType" | "encode" | "size" | "service" | "seeders" | "addon" | "regexPatterns" | "cached" | "library"
      switch (key) {
        case 'cached':
          return (
            multiplier *
            (stream.service?.cached || stream.type === 'http' ? 1 : 0)
          );

        case 'library':
          return multiplier * (stream.library ? 1 : 0);
        case 'size':
          return multiplier * (stream.size ?? 0);
        case 'seeders':
          return multiplier * (stream.torrent?.seeders ?? 0);
        case 'encode':
          return (
            multiplier *
            (userData.preferredEncodes?.findIndex(
              (encode) => encode === (stream.parsedFile?.encode || 'Unknown')
            ) ?? 0)
          );
        case 'addon':
          // find the first occurence of the stream.addon.id in the addons array
          const idx = userData.presets.findIndex(
            (p) => JSON.stringify(p) === stream.addon.id
          );
          return multiplier * (idx !== -1 ? -idx : 0);

        case 'resolution':
          return (
            multiplier *
            -(
              // negate as lower index = higher priority
              (
                userData.preferredResolutions?.findIndex(
                  (resolution) =>
                    resolution === (stream.parsedFile?.resolution || 'Unknown')
                ) ?? 0
              )
            )
          );

        case 'quality':
          return (
            multiplier *
            -(
              // negate as lower index = higher priority
              (
                userData.preferredQualities?.findIndex(
                  (quality) =>
                    quality === (stream.parsedFile?.quality || 'Unknown')
                ) ?? 0
              )
            )
          );

        case 'visualTag':
          let minIndex = userData.preferredVisualTags?.length;
          if (minIndex === undefined) {
            return 0;
          }
          if (!stream.parsedFile) {
            return 0;
          }
          for (const tag of stream.parsedFile?.visualTags || []) {
            if (VISUAL_TAGS.includes(tag as any)) {
              const idx = userData.preferredVisualTags?.indexOf(tag as any);
              if (idx !== undefined && idx !== -1 && idx < minIndex) {
                minIndex = idx;
              }
            }
          }
          return multiplier * -minIndex;

        case 'audioTag':
          let minAudioIndex = userData.preferredAudioTags?.length;
          if (minAudioIndex === undefined) {
            return 0;
          }
          if (!stream.parsedFile) {
            return 0;
          }
          for (const tag of stream.parsedFile.audioTags) {
            if (AUDIO_TAGS.includes(tag as any)) {
              const idx = userData.preferredAudioTags?.indexOf(tag as any);
              if (idx !== undefined && idx !== -1 && idx < minAudioIndex) {
                minAudioIndex = idx;
              }
            }
          }
          return multiplier * -minAudioIndex;

        case 'streamType':
          return (
            multiplier *
            -(
              userData.preferredStreamTypes?.findIndex(
                (type) => type === stream.type
              ) ?? 0
            )
          );

        case 'language':
          let minLanguageIndex = userData.preferredLanguages?.length;
          if (minLanguageIndex === undefined) {
            return 0;
          }
          for (const language of stream.parsedFile?.languages || ['Unknown']) {
            const idx = userData.preferredLanguages?.indexOf(language as any);
            if (idx !== undefined && idx !== -1 && idx < minLanguageIndex) {
              minLanguageIndex = idx;
            }
          }
          return multiplier * -minLanguageIndex;

        case 'regexPatterns':
          // each stream will have a property to denote the lowest index of the regex patterns that it matched
          // and we would just need to return that (multiplied by the multiplier)
          return multiplier * -(stream.regexMatched?.index ?? 0);

        case 'keyword':
          return multiplier * (stream.keywordMatched ? 1 : 0);

        case 'service':
          return (
            multiplier *
            -(
              // negate as lower index = higher priority
              (
                userData.services?.findIndex(
                  (service) => service.id === stream.service?.id
                ) ?? 0
              )
            )
          );
        default:
          return 0;
      }
    }

    return (
      sortCriteria.map((sortCriterion) =>
        keyValue(sortCriterion, this.userData)
      ) ?? []
    );
  }

  private limitStreams(streams: ParsedStream[]): ParsedStream[] {
    if (!this.userData.resultLimits) {
      return streams;
    }

    // these are our limits
    const {
      indexer,
      releaseGroup,
      resolution,
      quality,
      global,
      addon,
      streamType,
      service,
    } = this.userData.resultLimits;

    const start = Date.now();

    // Track counts for each category
    const counts = {
      indexer: new Map<string, number>(),
      releaseGroup: new Map<string, number>(),
      resolution: new Map<string, number>(),
      quality: new Map<string, number>(),
      addon: new Map<string, number>(),
      streamType: new Map<string, number>(),
      service: new Map<string, number>(),
      global: 0,
    };

    // Keep track of which indexes to remove
    const indexesToRemove = new Set<number>();

    // Process each stream and check against limits
    streams.forEach((stream, index) => {
      // Skip if already marked for removal
      if (indexesToRemove.has(index)) return;

      // Check global limit first
      if (global && counts.global >= global) {
        indexesToRemove.add(index);
        return;
      }

      // Check indexer limit
      if (indexer && stream.indexer) {
        const count = counts.indexer.get(stream.indexer) || 0;
        if (count >= indexer) {
          indexesToRemove.add(index);
          return;
        }
        counts.indexer.set(stream.indexer, count + 1);
      }

      // Check release group limit
      if (releaseGroup && stream.parsedFile?.releaseGroup) {
        const count =
          counts.releaseGroup.get(stream.parsedFile?.releaseGroup || '') || 0;
        if (count >= releaseGroup) {
          indexesToRemove.add(index);
          return;
        }
        counts.releaseGroup.set(stream.parsedFile.releaseGroup, count + 1);
      }

      // Check resolution limit
      if (resolution) {
        const count =
          counts.resolution.get(stream.parsedFile?.resolution || 'Unknown') ||
          0;
        if (count >= resolution) {
          indexesToRemove.add(index);
          return;
        }
        counts.resolution.set(
          stream.parsedFile?.resolution || 'Unknown',
          count + 1
        );
      }

      // Check quality limit
      if (quality) {
        const count =
          counts.quality.get(stream.parsedFile?.quality || 'Unknown') || 0;
        if (count >= quality) {
          indexesToRemove.add(index);
          return;
        }
        counts.quality.set(stream.parsedFile?.quality || 'Unknown', count + 1);
      }

      // Check addon limit
      if (addon && stream.addon.id) {
        const count = counts.addon.get(stream.addon.id) || 0;
        if (count >= addon) {
          indexesToRemove.add(index);
          return;
        }
        counts.addon.set(stream.addon.id, count + 1);
      }

      // Check stream type limit
      if (streamType && stream.type) {
        const count = counts.streamType.get(stream.type) || 0;
        if (count >= streamType) {
          indexesToRemove.add(index);
          return;
        }
        counts.streamType.set(stream.type, count + 1);
      }

      // Check service limit
      if (service && stream.service?.id) {
        const count = counts.service.get(stream.service.id) || 0;
        if (count >= service) {
          indexesToRemove.add(index);
          return;
        }
        counts.service.set(stream.service.id, count + 1);
      }

      // If we got here, increment global count
      counts.global++;
    });

    // Filter out the streams that exceeded limits
    const limitedStreams = streams.filter(
      (_, index) => !indexesToRemove.has(index)
    );

    // Log summary of removed streams
    const removedCount = streams.length - limitedStreams.length;
    if (removedCount > 0) {
      logger.info(
        `Removed ${removedCount} streams due to limits in ${getTimeTakenSincePoint(start)}`
      );
    }

    return limitedStreams;
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

    if (streamsToProxy.length === 0) {
      return streams;
    }
    logger.info(`Proxying ${streamsToProxy.length} streams`);

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

    logger.info(`Generated ${(proxiedUrls || []).length} proxied URLs`);

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
      logger.warn(
        `Failed to proxy ${removeIndexes.size} streams. Removing them from the list.`
      );
      streams = streams.filter((_, index) => !removeIndexes.has(index));
    }

    return streams;
  }
}
