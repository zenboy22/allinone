import { Addon, Option, UserData, Resource, ParsedStream, Stream } from '../db';
import { baseOptions, Preset } from './preset';
import { Env } from '../utils';
import { constants, ServiceId } from '../utils';
import { StreamParser } from '../parser';

class StremthruTorzStreamParser extends StreamParser {
  // ensure release groups aren't misidentified as indexers
  protected override getIndexer(
    stream: Stream,
    currentParsedStream: ParsedStream
  ): string | undefined {
    return undefined;
  }
}

export class StremthruTorzPreset extends Preset {
  static override getParser(): typeof StreamParser {
    return StremthruTorzStreamParser;
  }

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

    const supportedResources = [constants.STREAM_RESOURCE];

    const options: Option[] = [
      ...baseOptions(
        'StremThru Torz',
        supportedResources,
        Env.DEFAULT_STREMTHRU_STORE_TIMEOUT
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
          'StremThru Torz supports multiple services in one instance of the addon - which is used by default. If this is enabled, then the addon will be created for each service.',
        type: 'boolean',
        default: false,
      },
    ];

    return {
      ID: 'stremthruTorz',
      NAME: 'StremThru Torz',
      LOGO: 'https://emojiapi.dev/api/v1/sparkles/256.png',
      URL: Env.STREMTHRU_TORZ_URL,
      TIMEOUT: Env.DEFAULT_STREMTHRU_TORZ_TIMEOUT || Env.DEFAULT_TIMEOUT,
      USER_AGENT:
        Env.DEFAULT_STREMTHRU_TORZ_USER_AGENT || Env.DEFAULT_USER_AGENT,
      SUPPORTED_SERVICES: supportedServices,
      DESCRIPTION:
        'Access a crowdsourced torrent library supplemented by DMM hashlists',
      OPTIONS: options,
      SUPPORTED_STREAM_TYPES: [constants.DEBRID_STREAM_TYPE],
      SUPPORTED_RESOURCES: supportedResources,
    };
  }

  static async generateAddons(
    userData: UserData,
    options: Record<string, any>
  ): Promise<Addon[]> {
    // url can either be something like https://torrentio.com/ or it can be a custom manifest url.
    // if it is a custom manifest url, return a single addon with the custom manifest url.
    if (options?.url?.endsWith('/manifest.json')) {
      return [this.generateAddon(userData, options, [])];
    }

    const usableServices = this.getUsableServices(userData, options.services);
    // if no services are usable, throw an error
    if (!usableServices || usableServices.length === 0) {
      throw new Error(
        `${this.METADATA.NAME} requires at least one usable service, but none were found. Please enable at least one of the following services: ${this.METADATA.SUPPORTED_SERVICES.join(
          ', '
        )}`
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
        usableServices.map((s) => s.id)
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
      identifyingName: `${options.name || this.METADATA.NAME} ${serviceIds.map((id) => constants.SERVICE_DETAILS[id].shortName).join(' | ')}`,
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
    url = url.replace(/\/$/, '');
    if (!serviceIds || serviceIds.length === 0) {
      throw new Error(
        `${this.METADATA.NAME} requires at least one service, but none were found. Please enable at least one of the following services: ${this.METADATA.SUPPORTED_SERVICES.join(
          ', '
        )}`
      );
    }
    const configString = this.base64EncodeJSON({
      stores: serviceIds.map((serviceId) => ({
        c:
          serviceId === constants.PIKPAK_SERVICE
            ? 'pp'
            : constants.SERVICE_DETAILS[serviceId].shortName.toLowerCase(),
        t: this.getServiceCredential(serviceId, userData, {
          [constants.OFFCLOUD_SERVICE]: (credentials: any) =>
            `${credentials.email}:${credentials.password}`,
          [constants.PIKPAK_SERVICE]: (credentials: any) =>
            `${credentials.email}:${credentials.password}`,
        }),
      })),
    });

    return `${url}${configString ? '/' + configString : ''}/manifest.json`;
  }
}
