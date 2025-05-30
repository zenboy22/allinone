import { Addon, Option, UserData, Resource, Stream } from '../db';
import { baseOptions, Preset } from './preset';
import { Env } from '../utils';
import { constants, ServiceId } from '../utils';
import { StreamParser } from '../parser';

class MediaFusionStreamParser extends StreamParser {
  protected override raiseErrorIfNecessary(stream: Stream): void {
    if (stream.description?.includes('Content Warning')) {
      throw new Error(stream.description);
    }
  }

  get indexerEmojis(): string[] {
    return ['🔗'];
  }

  protected override getFolder(stream: Stream): string | undefined {
    const file = stream.description?.match(
      this.getRegexForTextAfterEmojis(['📂'])
    )?.[1];
    if (file && file.includes('┈➤')) {
      return file.split('┈➤')[0].trim();
    }
    return undefined;
  }

  protected override getFilename(stream: Stream): string | undefined {
    const file = stream.description?.match(
      this.getRegexForTextAfterEmojis(['📂'])
    )?.[1];
    if (file && file.includes('┈➤')) {
      return file.split('┈➤')[1].trim();
    }
    return file?.trim();
  }

  protected override getIndexer(stream: Stream): string | undefined {
    const indexer = super.getIndexer(stream);
    if (indexer === 'Contribution Stream') {
      const contributor = stream.name?.match(
        this.getRegexForTextAfterEmojis(['🧑‍💻'])
      )?.[1];
      return contributor ? `Contributor|${contributor}` : undefined;
    }
    return indexer;
  }
}

export class MediaFusionPreset extends Preset {
  static override getParser(): typeof StreamParser {
    return MediaFusionStreamParser;
  }

  static override get METADATA() {
    const supportedServices: ServiceId[] = [
      constants.REALDEBRID_SERVICE,
      constants.PREMIUMIZE_SERVICE,
      constants.ALLEDEBRID_SERVICE,
      constants.TORBOX_SERVICE,
      constants.DEBRIDLINK_SERVICE,
      constants.EASYDEBRID_SERVICE,
      constants.OFFCLOUD_SERVICE,
      constants.PIKPAK_SERVICE,
      constants.SEEDR_SERVICE,
    ];

    const supportedResources = [constants.STREAM_RESOURCE];

    const options: Option[] = [
      ...baseOptions(
        'MediaFusion',
        supportedResources,
        Env.DEFAULT_MEDIAFUSION_TIMEOUT
      ),
      {
        id: 'useCachedResultsOnly',
        name: 'Use Cached Results Only',
        description:
          "Only show results that are already cached in MediaFusion's database from previous searches. This disables live searching, making requests faster but potentially showing fewer results.",
        type: 'boolean',
        default: true,
      },
      {
        id: 'enableWatchlistCatalogs',
        name: 'Enable Watchlist Catalogs',
        description: 'Enable watchlist catalogs for the selected services.',
        type: 'boolean',
        default: false,
      },
      {
        id: 'downloadViaBrowser',
        name: 'Download via Browser',
        description:
          'Show download streams to allow downloading the stream from your service, rather than streaming.',
        type: 'boolean',
        default: false,
      },
      {
        id: 'certificationLevelsFilter',
        name: 'Certification Levels Filter',
        description:
          'Choose to not display streams for titles of a certain certification level. Leave blank to show all results.',
        type: 'multi-select',
        required: false,
        options: [
          {
            value: 'Unknown',
            label: 'Unknown',
          },
          {
            value: 'All Ages',
            label: 'All Ages',
          },
          {
            value: 'Children',
            label: 'Children',
          },
          {
            value: 'Parental Guidance',
            label: 'Parental Guidance',
          },
          {
            value: 'Teen',
            label: 'Teen',
          },
          {
            value: 'Adults',
            label: 'Adults',
          },
          {
            value: 'Adults+',
            label: 'Adults+',
          },
        ],
      },
      {
        id: 'nudityFilter',
        name: 'Nudity Filter',
        description:
          'Choose to not display streams that a certain level of nudity. Leave blank to show all results.',
        type: 'multi-select',
        required: false,
        options: [
          {
            value: 'Unknown',
            label: 'Unknown',
          },
          {
            value: 'None',
            label: 'None',
          },
          {
            value: 'Mild',
            label: 'Mild',
          },
          {
            value: 'Moderate',
            label: 'Moderate',
          },
          {
            value: 'Severe',
            label: 'Severe',
          },
        ],
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
    ];

    return {
      ID: 'mediafusion',
      NAME: 'MediaFusion',
      LOGO: `${Env.MEDIAFUSION_URL}/static/images/mediafusion-elfhosted-logo.png`,
      URL: Env.MEDIAFUSION_URL,
      TIMEOUT: Env.DEFAULT_MEDIAFUSION_TIMEOUT || Env.DEFAULT_TIMEOUT,
      USER_AGENT: Env.DEFAULT_MEDIAFUSION_USER_AGENT || Env.DEFAULT_USER_AGENT,
      SUPPORTED_SERVICES: supportedServices,
      DESCRIPTION:
        'Universal Stremio Add-on for Movies, Series, Live TV & Sports Events',
      OPTIONS: options,
      SUPPORTED_STREAM_TYPES: [
        constants.P2P_STREAM_TYPE,
        constants.DEBRID_STREAM_TYPE,
      ],
      SUPPORTED_RESOURCES: supportedResources,
    };
  }

  static async generateAddons(
    userData: UserData,
    options: Record<string, any>
  ): Promise<Addon[]> {
    if (options?.url?.endsWith('/manifest.json')) {
      return [this.generateAddon(userData, options, undefined)];
    }

    const usableServices = this.getUsableServices(userData, options.services);

    if (!usableServices || usableServices.length === 0) {
      return [this.generateAddon(userData, options, undefined)];
    }

    let addons = usableServices.map((service) =>
      this.generateAddon(userData, options, service.id)
    );

    if (options.includeP2P) {
      addons.push(this.generateAddon(userData, options, undefined));
    }

    return addons;
  }

  private static generateAddon(
    userData: UserData,
    options: Record<string, any>,
    serviceId?: ServiceId
  ): Addon {
    return {
      name: options.name || this.METADATA.NAME,
      // manifestUrl: this.generateManifestUrl(userData, options, serviceId),
      manifestUrl: `${Env.MEDIAFUSION_URL}/manifest.json`,
      enabled: true,
      resources: options.resources || this.METADATA.SUPPORTED_RESOURCES,
      timeout: options.timeout || this.METADATA.TIMEOUT,
      fromPresetId: this.METADATA.ID,
      headers: {
        'User-Agent': this.METADATA.USER_AGENT,
        encoded_user_data: this.generateEncodedUserData(
          userData,
          options,
          serviceId
        ),
      },
    };
  }

  private static generateEncodedUserData(
    userData: UserData,
    options: Record<string, any>,
    serviceId: ServiceId | undefined
  ) {
    let url = options.url || this.METADATA.URL;
    if (url.endsWith('/manifest.json')) {
      return url;
    }
    url = url.replace(/\/$/, '');
    if (!serviceId) {
      throw new Error('Service is required');
    }
    const configString = this.base64EncodeJSON({
      streaming_provider: !serviceId
        ? null
        : {
            token: this.getServiceCredential(serviceId, userData),
            service: serviceId,
            enable_watchlist_catalogs: options.enableWatchlistCatalogs || false,
            download_via_browser: options.downloadViaBrowser || false,
            only_show_cached_streams: false,
          },
      selected_catalogs: [],
      selected_resolutions: [
        '4k',
        '2160p',
        '1440p',
        '1080p',
        '720p',
        '576p',
        '480p',
        '360p',
        '240p',
        null,
      ],
      enable_catalogs: true,
      enable_imdb_metadata: false,
      max_size: 'inf',
      max_streams_per_resolution: '10',
      torrent_sorting_priority: [
        { key: 'language', direction: 'desc' },
        { key: 'cached', direction: 'desc' },
        { key: 'resolution', direction: 'desc' },
        { key: 'quality', direction: 'desc' },
        { key: 'size', direction: 'desc' },
        { key: 'seeders', direction: 'desc' },
        { key: 'created_at', direction: 'desc' },
      ],
      show_full_torrent_name: true,
      show_language_country_flag: false,
      nudity_filter: options.nudityFilter?.length
        ? options.nudityFilter
        : ['Disable'],
      certification_filter: options.certificationLevelsFilter?.length
        ? options.certificationLevelsFilter
        : ['Disable'],
      language_sorting: [
        'English',
        'Tamil',
        'Hindi',
        'Malayalam',
        'Kannada',
        'Telugu',
        'Chinese',
        'Russian',
        'Arabic',
        'Japanese',
        'Korean',
        'Taiwanese',
        'Latino',
        'French',
        'Spanish',
        'Portuguese',
        'Italian',
        'German',
        'Ukrainian',
        'Polish',
        'Czech',
        'Thai',
        'Indonesian',
        'Vietnamese',
        'Dutch',
        'Bengali',
        'Turkish',
        'Greek',
        'Swedish',
        'Romanian',
        'Hungarian',
        'Finnish',
        'Norwegian',
        'Danish',
        'Hebrew',
        'Lithuanian',
        'Punjabi',
        'Marathi',
        'Gujarati',
        'Bhojpuri',
        'Nepali',
        'Urdu',
        'Tagalog',
        'Filipino',
        'Malay',
        'Mongolian',
        'Armenian',
        'Georgian',
        null,
      ],
      quality_filter: [
        'BluRay/UHD',
        'WEB/HD',
        'DVD/TV/SAT',
        'CAM/Screener',
        'Unknown',
      ],
      api_password: Env.MEDIAFUSION_API_PASSWORD,
      mediaflow_config: null,
      rpdb_config: null,
      live_search_streams: options.liveSearchStreams || false,
      contribution_streams: false,
      mdblist_config: null,
    });

    return `${url}${configString ? '/' + configString : ''}/manifest.json`;
  }
}
