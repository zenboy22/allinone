import { Addon, Option, UserData, Resource, Stream } from '../db';
import { Preset } from './preset';
import { Env } from '../utils';
import { constants, ServiceId } from '../utils';
import { StreamParser } from '../parser';

export class TorrentioParser extends StreamParser {
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
    const supportedServices = [
      constants.REALDEBRID_SERVICE,
      constants.PREMIUMIZE_SERVICE,
      constants.ALLEDEBRID_SERVICE,
      constants.TORBOX_SERVICE,
      constants.EASYDEBRID_SERVICE,
      constants.PUTIO_SERVICE,
      constants.OFFCLOUD_SERVICE,
    ];

    const options: Option[] = [
      {
        id: 'services',
        name: 'Services',
        description: 'The services to use',
        type: 'multi-select',
        required: true,
        options: supportedServices.map((service) => ({
          value: service,
          label: service,
        })),
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
      DESCRIPTION: 'Torrentio preset',
      OPTIONS: options,
      TAGS: [constants.P2P_TAG, constants.DEBRID_TAG],
      RESOURCES: [
        constants.STREAM_RESOURCE,
        constants.META_RESOURCE,
        constants.CATALOG_RESOURCE,
      ],
    };
  }

  static async generateAddons(
    userData: UserData,
    options?: Record<string, any>,
    baseUrl?: string,
    name?: string,
    timeout?: number,
    resources?: Resource[]
  ): Promise<Addon[]> {
    // baseUrl can either be something like https://torrentio.com/ or it can be a custom manifest url.
    // if it is a custom manifest url, return a single addon with the custom manifest url.
    if (baseUrl?.endsWith('/manifest.json')) {
      return [
        this.generateAddon(userData, [], baseUrl, name, timeout, resources),
      ];
    }

    // get all services that are supported by the preset and enabled
    let usableServices = userData.services?.filter(
      (service) =>
        this.METADATA.SUPPORTED_SERVICES.includes(service.id) && service.enabled
    );

    // if user has specified services, filter the usable services to only include the specified services
    if (options?.services) {
      usableServices = usableServices?.filter((service) =>
        options.services.includes(service.id)
      );
    }

    // if no services are usable, return a single addon with no services
    if (!usableServices || usableServices.length === 0) {
      return [
        this.generateAddon(userData, [], baseUrl, name, timeout, resources),
      ];
    }

    // if user has specified useMultipleInstances, return a single addon for each service
    if (options?.useMultipleInstances) {
      return usableServices.map((service) =>
        this.generateAddon(
          userData,
          [service.id],
          baseUrl,
          name,
          timeout,
          resources
        )
      );
    }

    // return a single addon with all usable services
    return [
      this.generateAddon(
        userData,
        usableServices.map((service) => service.id),
        baseUrl,
        name,
        timeout
      ),
    ];
  }

  private static generateAddon(
    userData: UserData,
    services: ServiceId[],
    baseUrl?: string,
    name?: string,
    timeout?: number,
    resources?: Resource[]
  ): Addon {
    return {
      name: name || this.METADATA.NAME,
      manifestUrl: this.generateManifestUrl(userData, services, baseUrl),
      enabled: true,
      resources: resources || this.METADATA.RESOURCES,
      timeout: timeout || this.METADATA.TIMEOUT,
      fromPresetId: this.METADATA.ID,
      headers: {
        'User-Agent': this.METADATA.USER_AGENT,
      },
    };
  }

  private static generateManifestUrl(
    userData: UserData,
    services: ServiceId[],
    baseUrl?: string
  ) {
    const url = baseUrl || this.METADATA.URL;
    if (url.endsWith('/manifest.json')) {
      return url;
    }
    const configString = services.length
      ? this.urlEncodeKeyValuePairs(
          services.map((service) => [
            service,
            this.getServiceCredential(service, userData),
          ])
        )
      : '';

    return `${url}${configString ? '/' + configString : ''}/manifest.json`;
  }

  private static getServiceCredential(
    serviceId: ServiceId,
    userData: UserData
  ): string {
    // Validate service exists
    const service = constants.SERVICE_DETAILS[serviceId];
    if (!service) {
      throw new Error(`Service ${serviceId} not found`);
    }

    // Get credentials for service
    const serviceCredentials = userData.services?.find(
      (service) => service.id === serviceId
    )?.credentials;

    if (!serviceCredentials) {
      throw new Error(`No credentials found for service ${serviceId}`);
    }

    // Handle put.io special case which requires both clientId and token
    if (serviceId === constants.PUTIO_SERVICE) {
      const { clientId, token } = serviceCredentials;
      if (!clientId || !token) {
        throw new Error(
          `Missing credentials for ${serviceId}. Please add a client ID and token.`
        );
      }
      return `${clientId}@${token}`;
    }

    // Handle default case which requires just an API key
    const { apiKey } = serviceCredentials;
    if (!apiKey) {
      throw new Error(
        `Missing credentials for ${serviceId}. Please add an API key.`
      );
    }
    return apiKey;
  }
}
