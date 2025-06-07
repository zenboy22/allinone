import { Addon, Option, UserData, Resource, Stream } from '../db';
import { Preset, baseOptions } from './preset';
import { Env, SERVICE_DETAILS } from '../utils';
import { constants, ServiceId } from '../utils';
import { StreamParser } from '../parser';

export class NuvioStreamsPreset extends Preset {
  static override get METADATA() {
    const supportedResources = [constants.STREAM_RESOURCE];
    const regions = [
      {
        value: 'USA7',
        label: 'USA East',
      },
      {
        value: 'USA6',
        label: 'USA West',
      },
      {
        value: 'USA5',
        label: 'USA Middle',
      },
      {
        value: 'UK3',
        label: 'United Kingdom',
      },
      {
        value: 'CA1',
        label: 'Canada',
      },
      {
        value: 'FR1',
        label: 'France',
      },
      {
        value: 'DE2',
        label: 'Germany',
      },
      {
        value: 'HK1',
        label: 'Hong Kong',
      },
      {
        value: 'IN1',
        label: 'India',
      },
      {
        value: 'AU1',
        label: 'Australia',
      },
      {
        value: 'SZ',
        label: 'China',
      },
    ];
    const providers = [
      {
        value: 'showbox',
        label: 'Showbox',
      },
      {
        value: 'xprime',
        label: 'XPrime',
      },
      {
        value: 'hollymoviehd',
        label: 'HollyMovieHD',
      },
      {
        value: 'cuevana',
        label: 'Cuevana',
      },
      {
        value: 'soapertv',
        label: 'Soapertv',
      },
      {
        value: 'vidzee',
        label: 'Vidzee',
      },
      {
        value: 'hianime',
        label: 'HiAnime',
      },
      {
        value: 'vidsrc',
        label: 'Vidsrc',
      },
    ];

    const options: Option[] = [
      ...baseOptions(
        'Nuvio Streams',
        supportedResources,
        Env.DEFAULT_NUVIOSTREAMS_TIMEOUT
      ),
      {
        id: 'scraperApiKey',
        name: 'Scraper API Key',
        description:
          'Optionally provide a [ScraperAPI](https://www.scraperapi.com/) API Key from',
        type: 'string',
        required: false,
        default: '',
      },
      {
        id: 'showBoxCookie',
        name: 'ShowBox Cookie',
        description:
          'The cookie for the ShowBox provider. Highly recommended to get streams greater than 9GB. Log in at [Febbox](https://www.febbox.com/) > DevTools > Storage > Cookied > Copy the value of the `ui` cookie. ',
        type: 'string',
        required: false,
        default: '',
      },
      {
        id: 'showBoxRegion',
        name: 'ShowBox Region',
        description: 'The region to use for the ShowBox provider',
        type: 'select',
        required: false,
        options: regions,
        default: regions[0].value,
      },
      {
        id: 'providers',
        name: 'Providers',
        description: 'The providers to use',
        type: 'multi-select',
        required: true,
        options: providers,
        default: providers.map((provider) => provider.value),
      },
      {
        id: 'streamPassthrough',
        name: 'Stream Passthrough',
        description:
          'Whether to use the original stream name and description. Recommended to be left on in order to get all the information.',
        type: 'boolean',
        required: false,
        default: true,
      },
    ];

    return {
      ID: 'nuvio-streams',
      NAME: 'Nuvio Streams',
      LOGO: 'https://raw.githubusercontent.com/tapframe/NuvioStreaming/main/assets/titlelogo.png',
      URL: Env.DEFAULT_NUVIOSTREAMS_URL,
      TIMEOUT: Env.DEFAULT_NUVIOSTREAMS_TIMEOUT || Env.DEFAULT_TIMEOUT,
      USER_AGENT: Env.DEFAULT_NUVIOSTREAMS_USER_AGENT || Env.DEFAULT_USER_AGENT,
      SUPPORTED_SERVICES: [],
      DESCRIPTION: 'Free high quality streaming using multiple providers. ',
      OPTIONS: options,
      SUPPORTED_STREAM_TYPES: [constants.HTTP_STREAM_TYPE],
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
      return [this.generateAddon(userData, options)];
    }

    return [this.generateAddon(userData, options)];
  }

  private static generateAddon(
    userData: UserData,
    options: Record<string, any>
  ): Addon {
    return {
      name: options.name || this.METADATA.NAME,
      identifyingName: options.name || this.METADATA.NAME,
      manifestUrl: this.generateManifestUrl(userData, options),
      enabled: true,
      streamPassthrough: options.streamPassthrough ?? true,
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
    options: Record<string, any>
  ) {
    const url = options.url || this.METADATA.URL;
    if (url.endsWith('/manifest.json')) {
      return url;
    }

    // cookie=eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpYXQiOjE3NDkzMzQ1OTIsIm5iZiI6MTc0OTMzNDU5MiwiZXhwIjoxNzgwNDM4NjEyLCJkYXRhIjp7InVpZCI6ODExNjU4LCJ0b2tlbiI6ImM2ZDc3NGVlMzdkNGYzNzUxMzhlZTBjOThhNWQ1YzIyIn19.q1UC_4JJvCB5dWnOsSOAxhrOnTVZR4flELz9my5tlX4/region=USA7/providers=showbox,xprime,hollymoviehd,soapertv,vidzee,hianime,vidsrc/scraper_api_key=dsad
    const cookie = options.showBoxCookie;
    const providers = options.providers;
    const scraperApiKey = options.scraperApiKey;
    let config = [];
    if (cookie) {
      config.push(['cookie', cookie]);
    }
    if (options.showBoxRegion) {
      config.push(['region', options.showBoxRegion]);
    }
    if (providers) {
      config.push(['providers', providers.join(',')]);
    }
    if (scraperApiKey) {
      config.push(['scraper_api_key', scraperApiKey]);
    }

    const configString = this.urlEncodeKeyValuePairs(config, '/', false);

    return `${url}${configString ? '/' + configString : ''}/manifest.json`;
  }
}
