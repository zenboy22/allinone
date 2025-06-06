import { Addon, Option, UserData, Resource, Stream } from '../db';
import { Preset, baseOptions } from './preset';
import { Env, SERVICE_DETAILS } from '../utils';
import { constants, ServiceId } from '../utils';
import { StreamParser } from '../parser';

export class TorrentioParser extends StreamParser {
  protected override get sizeK(): 1024 | 1000 {
    return 1024;
  }
  // protected override get sizeRegex(): RegExp | undefined {
  //   return /💾\s*(\d+(\.\d+)?)\s?(KB|MB|GB|TB)/i;
  // }
  override getFolder(stream: Stream): string | undefined {
    const description = stream.description || stream.title;
    if (!description) {
      return undefined;
    }
    const folderName = description.split('\n')[0];
    return folderName;
  }
}

export class TorrentioPreset extends Preset {
  static override getParser(): typeof StreamParser {
    return TorrentioParser;
  }

  static override get METADATA() {
    const supportedServices: ServiceId[] = [
      constants.REALDEBRID_SERVICE,
      constants.PREMIUMIZE_SERVICE,
      constants.ALLEDEBRID_SERVICE,
      constants.TORBOX_SERVICE,
      constants.EASYDEBRID_SERVICE,
      constants.PUTIO_SERVICE,
      constants.DEBRIDLINK_SERVICE,
      constants.OFFCLOUD_SERVICE,
    ];
    const supportedResources = [
      constants.STREAM_RESOURCE,
      constants.CATALOG_RESOURCE,
      constants.META_RESOURCE,
    ];

    const options: Option[] = [
      ...baseOptions(
        'Torrentio',
        supportedResources,
        Env.DEFAULT_TORRENTIO_TIMEOUT
      ),
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
        name: 'Use Multiple Instances',
        description:
          'When using multiple services, use a different Torrentio addon for each service, rather than using one instance for all services',
        type: 'boolean',
        default: false,
        required: true,
      },
    ];

    return {
      ID: 'torrentio',
      NAME: 'Torrentio',
      LOGO: `${Env.TORRENTIO_URL}/images/logo_v1.png`,
      URL: Env.TORRENTIO_URL,
      TIMEOUT: Env.DEFAULT_TORRENTIO_TIMEOUT || Env.DEFAULT_TIMEOUT,
      USER_AGENT: Env.DEFAULT_TORRENTIO_USER_AGENT || Env.DEFAULT_USER_AGENT,
      SUPPORTED_SERVICES: supportedServices,
      REQUIRES_SERVICE: false,
      DESCRIPTION:
        'Provides torrent streams from a multitude of providers and has debrid support.',
      OPTIONS: options,
      SUPPORTED_STREAM_TYPES: [
        constants.P2P_STREAM_TYPE,
        constants.DEBRID_STREAM_TYPE,
      ],
      SUPPORTED_RESOURCES: [
        constants.STREAM_RESOURCE,
        constants.META_RESOURCE,
        constants.CATALOG_RESOURCE,
      ],
    };
  }

  static async generateAddons(
    userData: UserData,
    options: Record<string, any>
  ): Promise<Addon[]> {
    // baseUrl can either be something like https://torrentio.com/ or it can be a custom manifest url.
    // if it is a custom manifest url, return a single addon with the custom manifest url.
    if (options?.url?.endsWith('/manifest.json')) {
      return [this.generateAddon(userData, options, [])];
    }

    const usableServices = this.getUsableServices(userData, options.services);

    // if no services are usable, return a single addon with no services
    if (!usableServices || usableServices.length === 0) {
      return [this.generateAddon(userData, options, [])];
    }

    // if user has specified useMultipleInstances, return a single addon for each service
    if (options?.useMultipleInstances) {
      return usableServices.map((service) =>
        this.generateAddon(userData, options, [service.id])
      );
    }

    // return a single addon with all usable services
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
    services: ServiceId[]
  ): Addon {
    return {
      name: options.name || this.METADATA.NAME,
      identifyingName: `${options.name || this.METADATA.NAME} ${services.map((id) => constants.SERVICE_DETAILS[id].shortName).join(' | ')}`,
      manifestUrl: this.generateManifestUrl(userData, services, options.url),
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
    services: ServiceId[],
    url?: string
  ) {
    url = url || this.METADATA.URL;
    if (url.endsWith('/manifest.json')) {
      return url;
    }

    const configString = services.length
      ? this.urlEncodeKeyValuePairs(
          services.map((service) => [
            service,
            this.getServiceCredential(service, userData, {
              [constants.PUTIO_SERVICE]: (credentials: any) =>
                `${credentials.clientId}@${credentials.token}`,
            }),
          ])
        )
      : '';

    return `${url}${configString ? '/' + configString : ''}/manifest.json`;
  }
}
