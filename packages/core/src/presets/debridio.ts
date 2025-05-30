import { Addon, Option, UserData, Resource, Stream } from '../db';
import { Preset, baseOptions } from './preset';
import { Env, SERVICE_DETAILS } from '../utils';
import { constants, ServiceId } from '../utils';
import { StreamParser } from '../parser';

export class DebridioPreset extends Preset {
  static override get METADATA() {
    const supportedServices: ServiceId[] = [constants.EASYDEBRID_SERVICE];
    const supportedResources = [constants.STREAM_RESOURCE];

    const options: Option[] = [
      ...baseOptions(
        'Debridio',
        supportedResources,
        Env.DEFAULT_DEBRIDIO_TIMEOUT
      ),
      // {
      //   id: 'services',
      //   name: 'Services',
      //   description:
      //     'Optionally override the services that are used. If not specified, then the services that are enabled and supported will be used.',
      //   type: 'multi-select',
      //   required: false,
      //   options: supportedServices.map((service) => ({
      //     value: service,
      //     label: constants.SERVICE_DETAILS[service].name,
      //   })),
      //   default: undefined,
      //   emptyIsUndefined: true,
      // },
      // {
      //   id: 'useMultipleInstances',
      //   name: 'Use Multiple Instances',
      //   description:
      //     'When using multiple services, use a different Torrentio addon for each service, rather than using one instance for all services',
      //   type: 'boolean',
      //   default: false,
      //   required: true,
      // },
    ];

    return {
      ID: 'debridio',
      NAME: 'Debridio',
      LOGO: 'https://res.cloudinary.com/adobotec/image/upload/w_120,h_120/v1735925306/debridio/logo.png.png',
      URL: Env.DEBRIDIO_URL,
      TIMEOUT: Env.DEFAULT_DEBRIDIO_TIMEOUT || Env.DEFAULT_TIMEOUT,
      USER_AGENT: Env.DEFAULT_DEBRIDIO_USER_AGENT || Env.DEFAULT_USER_AGENT,
      SUPPORTED_SERVICES: supportedServices,
      DESCRIPTION: 'Torrent streaming using Debrid providers.',
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
    if (options?.url?.endsWith('/manifest.json')) {
      return [this.generateAddon(userData, options, undefined)];
    }

    const usableServices = this.getUsableServices(userData);

    // if no services are usable, return a single addon with no services
    if (!usableServices || usableServices.length === 0) {
      throw new Error(
        `${this.METADATA.NAME} requires at least one of the following services to be enabled: ${this.METADATA.SUPPORTED_SERVICES.join(
          ', '
        )}`
      );
    }

    return usableServices.map((service) =>
      this.generateAddon(userData, options, service.id)
    );
  }

  private static generateAddon(
    userData: UserData,
    options: Record<string, any>,
    service?: ServiceId
  ): Addon {
    return {
      name: options.name || this.METADATA.NAME,
      manifestUrl: this.generateManifestUrl(userData, service, options.url),
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
    service?: ServiceId,
    url?: string
  ) {
    url = url || this.METADATA.URL;
    if (url.endsWith('/manifest.json')) {
      return url;
    }
    if (!service) {
      throw new Error(
        `${this.METADATA.NAME} requires at least one of the following services to be enabled: ${this.METADATA.SUPPORTED_SERVICES.join(
          ', '
        )}`
      );
    }

    const configString = this.base64EncodeJSON({
      provider: service,
      apiKey: this.getServiceCredential(service, userData),
      disableUncached: false,
      qualityOrder: [],
      excludeSize: '',
      maxReturnPerQuality: '',
    });

    return `${url}${configString ? '/' + configString : ''}/manifest.json`;
  }
}
