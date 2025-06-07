import { Addon, Option, UserData, Resource } from '../db';
import { baseOptions, Preset } from './preset';
import { Env } from '../utils';
import { constants, ServiceId } from '../utils';

export class StreamFusionPreset extends Preset {
  static override get METADATA() {
    const supportedServices: ServiceId[] = [
      constants.REALDEBRID_SERVICE,
      constants.PREMIUMIZE_SERVICE,
      constants.ALLEDEBRID_SERVICE,
      constants.TORBOX_SERVICE,
      constants.EASYDEBRID_SERVICE,
      constants.DEBRIDLINK_SERVICE,
      constants.OFFCLOUD_SERVICE,
      constants.PIKPAK_SERVICE,
    ];

    const supportedResources = [
      constants.STREAM_RESOURCE,
      constants.CATALOG_RESOURCE,
      constants.META_RESOURCE,
    ];

    const options: Option[] = [
      ...baseOptions(
        'StreamFusion',
        supportedResources,
        Env.DEFAULT_STREAMFUSION_TIMEOUT
      ),
      {
        id: 'streamFusionApiKey',
        name: 'StreamFusion API Key',
        description:
          'The API key for the StreamFusion service. You can get it by sending the `/generate` command to the [StremioFR Telegram bot](https://t.me/Stremiofr_bot)',
        type: 'password',
        required: true,
      },
      {
        id: 'torboxSearch',
        name: 'Torbox Search',
        description:
          "Enable or disable the use of Torbox's Public Torrent Search Engine",
        type: 'boolean',
        required: false,
        default: false,
      },
      {
        id: 'torboxUsenet',
        name: 'Torbox Usenet',
        description:
          "Enable or disable the use of Torbox's Usenet search and download functionality.",
        type: 'boolean',
        required: false,
        default: false,
      },
      {
        id: 'catalogs',
        name: 'Catalogs',
        description: 'What catalogs should be displayed',
        type: 'multi-select',
        required: false,
        options: [
          {
            value: 'yggtorrent',
            label: 'YggTorrent',
          },
          {
            value: 'yggflix',
            label: 'YggFlix',
          },
        ],
        default: ['yggtorrent', 'yggflix'],
      },
      {
        id: 'torrenting',
        name: 'Torrenting',
        description:
          "Use direct torrent streaming instead of debrid. If you haven't provided any debrid SERVICES, torrenting is automatically used and this option does not apply to you.",
        type: 'boolean',
        required: false,
        default: false,
      },
      {
        id: 'services',
        name: 'Services',
        description:
          'Optionally override the services that are used. If not specified, then the services that are enabled and supported will be used.',
        type: 'multi-select',
        required: false,
        options: supportedServices.map((service) => ({
          value: service,
          label: constants.SERVICE_DETAILS[service].name,
        })),
        default: undefined,
        emptyIsUndefined: true,
      },
      {
        id: 'useMultipleInstances',
        name: 'Use multiple instances',
        description:
          'If enabled, the addon will use multiple instances of the same service. This is useful if you want to use different services for different catalogs.',
        type: 'boolean',
        required: false,
        default: false,
      },
      {
        id: 'debridDownloader',
        name: 'Debrid Downloader',
        description:
          'The debrid downloader to use. If you have not checked the above option, select a service here that will be used for uncached links.',
        type: 'select',
        required: false,
        options: supportedServices.map((service) => ({
          value: constants.SERVICE_DETAILS[service].name,
          label: constants.SERVICE_DETAILS[service].name,
        })),
        default: undefined,
        emptyIsUndefined: true,
      },
    ];

    return {
      ID: 'streamfusion',
      NAME: 'StreamFusion',
      LOGO: 'https://stream-fusion.stremiofr.com/static/logo-stream-fusion.png',
      URL: Env.DEFAULT_STREAMFUSION_URL,
      TIMEOUT: Env.DEFAULT_STREAMFUSION_TIMEOUT || Env.DEFAULT_TIMEOUT,
      USER_AGENT: Env.DEFAULT_STREAMFUSION_USER_AGENT || Env.DEFAULT_USER_AGENT,
      SUPPORTED_SERVICES: supportedServices,
      DESCRIPTION: 'Stremio addon focusing on french content',
      OPTIONS: options,
      SUPPORTED_STREAM_TYPES: [
        constants.DEBRID_STREAM_TYPE,
        constants.P2P_STREAM_TYPE,
      ],
      SUPPORTED_RESOURCES: supportedResources,
    };
  }

  static async generateAddons(
    userData: UserData,
    options: Record<string, any>
  ): Promise<Addon[]> {
    if (options?.url?.endsWith('/manifest.json')) {
      return [this.generateAddon(userData, options, [])];
    }

    const usableServices = this.getUsableServices(userData, options.services);
    if (!usableServices || usableServices.length === 0) {
      throw new Error(
        `${this.METADATA.NAME} requires at least one usable service from the list of supported services: ${this.METADATA.SUPPORTED_SERVICES.map((service) => constants.SERVICE_DETAILS[service].name).join(', ')}`
      );
    }

    if (options.useMultipleInstances) {
      return usableServices.map((service) =>
        this.generateAddon(userData, options, [service.id])
      );
    }

    return [
      this.generateAddon(
        userData,
        options,
        usableServices.map((service) => service.id)
      ),
    ];
  }

  private static generateAddon(
    userData: UserData,
    options: Record<string, any>,
    serviceIds: ServiceId[]
  ): Addon {
    return {
      name: options.name || this.METADATA.NAME,
      identifyingName: `${options.name || this.METADATA.NAME} ${serviceIds
        .map((serviceId) => constants.SERVICE_DETAILS[serviceId].shortName)
        .join(' | ')}`,
      manifestUrl: this.generateManifestUrl(userData, options, serviceIds),
      enabled: true,
      resources: options.resources || this.METADATA.SUPPORTED_RESOURCES,
      timeout: options.timeout || this.METADATA.TIMEOUT,
      fromPresetId: this.METADATA.ID,
      headers: {
        'User-Agent': this.METADATA.USER_AGENT,
      },
    };
  }

  private static generateManifestUrl(
    userData: UserData,
    options: Record<string, any>,
    serviceIds: ServiceId[]
  ) {
    let url = options.url || this.METADATA.URL;
    if (url.endsWith('/manifest.json')) {
      return url;
    }

    const specialCases = {
      [constants.OFFCLOUD_SERVICE]: (credentials: any) =>
        `${credentials.email}:${credentials.password}`,
      [constants.PIKPAK_SERVICE]: (credentials: any) =>
        `${credentials.email}:${credentials.password}`,
    };

    url = url.replace(/\/$/, '');
    const configString = this.base64EncodeJSON({
      addonHost: options.url ? new URL(options.url).origin : this.METADATA.URL,
      apiKey: options.streamFusionApiKey,
      service: serviceIds.map(
        (serviceId) => constants.SERVICE_DETAILS[serviceId].name
      ),
      // this probably doesnt work for RD and AD as configuration page uses oauth flow and puts json response from RD/AD as values.
      RDToken: serviceIds.includes(constants.REALDEBRID_SERVICE)
        ? this.getServiceCredential(constants.REALDEBRID_SERVICE, userData)
        : '',
      ADToken: serviceIds.includes(constants.ALLEDEBRID_SERVICE)
        ? this.getServiceCredential(constants.ALLEDEBRID_SERVICE, userData)
        : '',
      TBToken: serviceIds.includes(constants.TORBOX_SERVICE)
        ? this.getServiceCredential(constants.TORBOX_SERVICE, userData)
        : '',
      PMToken: serviceIds.includes(constants.PREMIUMIZE_SERVICE)
        ? this.getServiceCredential(constants.PREMIUMIZE_SERVICE, userData)
        : '',
      debridlinkApiKey: serviceIds.includes(constants.DEBRIDLINK_SERVICE)
        ? this.getServiceCredential(constants.DEBRIDLINK_SERVICE, userData)
        : '',
      easydebridApiKey: serviceIds.includes(constants.EASYDEBRID_SERVICE)
        ? this.getServiceCredential(constants.EASYDEBRID_SERVICE, userData)
        : '',
      offcloudCredentials: serviceIds.includes(constants.OFFCLOUD_SERVICE)
        ? this.getServiceCredential(
            constants.OFFCLOUD_SERVICE,
            userData,
            specialCases
          )
        : '',
      pikpakCredentials: serviceIds.includes(constants.PIKPAK_SERVICE)
        ? this.getServiceCredential(
            constants.PIKPAK_SERVICE,
            userData,
            specialCases
          )
        : '',
      TBUsenet: options.torboxUsenet,
      TBSearch: options.torboxSearch,
      maxSize: 18,
      exclusionKeywords: [],
      languages: ['en', 'fr', 'multi'],
      sort: 'quality',
      resultsPerQuality: 10,
      maxResults: 30,
      minCachedResults: 10,
      exclusion: [],
      cacheUrl: 'https://stremio-jackett-cacher.elfhosted.com/',
      cache: true,
      zilean: false, //true,
      yggflix: false, //true,
      sharewood: false, //true,
      yggtorrentCtg: options.catalogs.includes('yggtorrent'),
      yggflixCtg: options.catalogs.includes('yggflix'),
      torrenting:
        serviceIds.length === 0 ? true : (options.torrenting ?? false),
      debrid: serviceIds.length > 0,
      metadataProvider: 'tmdb',
      debridDownloader: options.useMultipleInstances
        ? constants.SERVICE_DETAILS[serviceIds[0]].name
        : options.debridDownloader,
      stremthru: true,
      stremthruUrl: Env.DEFAULT_STREAMFUSION_STREMTHRU_URL,
    });

    return `${url}${configString ? '/' + configString : ''}/manifest.json`;
  }
}
