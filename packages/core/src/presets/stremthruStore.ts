import { Addon, Option, UserData, Resource } from '../db';
import { baseOptions, Preset } from './preset';
import { Env } from '../utils';
import { constants, ServiceId } from '../utils';

export class StremthruStorePreset extends Preset {
  static override get METADATA() {
    const supportedServices: ServiceId[] = [
      constants.REALDEBRID_SERVICE,
      constants.PREMIUMIZE_SERVICE,
      constants.ALLEDEBRID_SERVICE,
      constants.TORBOX_SERVICE,
      constants.EASYDEBRID_SERVICE,
      constants.PUTIO_SERVICE,
      constants.OFFCLOUD_SERVICE,
    ];

    const supportedResources = [
      constants.STREAM_RESOURCE,
      constants.CATALOG_RESOURCE,
      constants.META_RESOURCE,
    ];

    const options: Option[] = [
      ...baseOptions(
        'Stremthru Store',
        supportedResources,
        Env.DEFAULT_STREMTHRU_STORE_TIMEOUT
      ),
      {
        id: 'services',
        name: 'Services',
        description: 'The services that will be used',
        type: 'multi-select',
        required: true,
        options: supportedServices.map((service) => ({
          value: service,
          label: constants.SERVICE_DETAILS[service].name,
        })),
        default: supportedServices,
      },
      // THESE OPTIONS are covered by the resource option, so no need to provide them here.
      // {
      //   id: 'hideCatalog',
      //   name: 'Hide Catalog',
      //   description: 'Hide the catalog',
      //   type: 'boolean',
      // },
      // {
      //   id: 'hideStream',
      //   name: 'Hide Stream',
      //   description: 'Hide the stream',
      //   type: 'boolean',
      // },
      {
        id: 'webDl',
        name: 'Web DL',
        description: 'Enable web DL',
        type: 'boolean',
      },
    ];

    return {
      ID: 'stremthruStore',
      NAME: 'StremThru Store',
      LOGO: 'https://emojiapi.dev/api/v1/sparkles/256.png',
      URL: Env.STREMTHRU_STORE_URL,
      TIMEOUT: Env.DEFAULT_STREMTHRU_STORE_TIMEOUT || Env.DEFAULT_TIMEOUT,
      USER_AGENT:
        Env.DEFAULT_STREMTHRU_STORE_USER_AGENT || Env.DEFAULT_USER_AGENT,
      SUPPORTED_SERVICES: supportedServices,
      DESCRIPTION:
        'StremThru Store allows you to access streams from your debrid library, either through its own catalogs, or through streams for other catalogs.',
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
      return [this.generateAddon(userData, options, undefined)];
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

    // if no services are usable, throw an error
    if (!usableServices || usableServices.length === 0) {
      throw new Error('No services are usable');
    }

    return usableServices.map((service) =>
      this.generateAddon(userData, options, service.id)
    );
  }

  private static generateAddon(
    userData: UserData,
    options: Record<string, any>,
    serviceId?: ServiceId
  ): Addon {
    return {
      name: options.name || this.METADATA.NAME,
      manifestUrl: this.generateManifestUrl(userData, options, serviceId),
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
      store_name: serviceId,
      store_token: this.getServiceCredential(serviceId, userData),
      hide_catalog: false,
      hide_stream: false,
      web_dl: options.webDl ?? false,
    });

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
    if (
      serviceId === constants.OFFCLOUD_SERVICE ||
      serviceId === constants.PIKPAK_SERVICE
    ) {
      const { email, password } = serviceCredentials;
      if (!email || !password) {
        throw new Error(
          `Missing credentials for ${serviceId}. Please add an email and password.`
        );
      }
      return `${email}:${password}`;
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
