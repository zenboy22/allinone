import { Addon, Option, UserData } from '../db';
import { Preset, baseOptions } from './preset';
import { constants, Env, FULL_LANGUAGE_MAPPING } from '../utils';

export class TmdbCollectionsPreset extends Preset {
  static override get METADATA() {
    const supportedResources = [
      constants.CATALOG_RESOURCE,
      constants.META_RESOURCE,
    ];

    const options: Option[] = [
      ...baseOptions(
        'TMDB Collections',
        supportedResources,
        Env.DEFAULT_TMDB_COLLECTIONS_TIMEOUT
      ),
      {
        id: 'enableAdultContent',
        name: 'Enable Adult Content',
        description: 'Enable adult content in the catalogs',
        type: 'boolean',
        default: false,
        required: false,
      },
      {
        id: 'enableSearch',
        name: 'Enable Search',
        description: 'Enable search in the catalogs',
        type: 'boolean',
        default: true,
        required: false,
      },
      {
        id: 'language',
        name: 'Language',
        description: 'The language of the catalogs',
        type: 'select',
        default: 'en',
        options: FULL_LANGUAGE_MAPPING.sort((a, b) =>
          a.english_name.localeCompare(b.english_name)
        )
          .filter(
            (language, index, self) =>
              index ===
              self.findIndex((l) => l.iso_639_1 === language.iso_639_1)
          )
          .map((language) => ({
            label: language.english_name.split('(')[0].trim(),
            value: `${language.iso_639_1}`,
          })),
        required: false,
      },
    ];

    return {
      ID: 'tmdb-collections',
      NAME: 'TMDB Collections',
      LOGO: 'https://raw.githubusercontent.com/youchi1/tmdb-collections/main/Images/logo.png',
      URL: Env.TMDB_COLLECTIONS_URL,
      TIMEOUT: Env.DEFAULT_TMDB_COLLECTIONS_TIMEOUT || Env.DEFAULT_TIMEOUT,
      USER_AGENT:
        Env.DEFAULT_TMDB_COLLECTIONS_USER_AGENT || Env.DEFAULT_USER_AGENT,
      SUPPORTED_SERVICES: [],
      DESCRIPTION: 'Catalogs for the TMDB Collections',
      OPTIONS: options,
      SUPPORTED_STREAM_TYPES: [],
      SUPPORTED_RESOURCES: supportedResources,
    };
  }

  static async generateAddons(
    userData: UserData,
    options: Record<string, any>
  ): Promise<Addon[]> {
    return [this.generateAddon(userData, options)];
  }

  private static generateAddon(
    userData: UserData,
    options: Record<string, any>
  ): Addon {
    const config = this.urlEncodeJSON({
      enableAdultContent: options.enableAdultContent ?? false,
      enableSearch: options.enableSearch ?? true,
      language: options.language,
      catalogList: ['popular', 'topRated', 'newReleases'],
      discoverOnly: { popular: false, topRated: false, newReleases: false },
    });
    return {
      name: options.name || this.METADATA.NAME,
      identifyingName: options.name || this.METADATA.NAME,
      manifestUrl: `${this.METADATA.URL}/${config}/manifest.json`,
      enabled: true,
      library: false,
      resources: options.resources || this.METADATA.SUPPORTED_RESOURCES,
      timeout: options.timeout || this.METADATA.TIMEOUT,
      presetType: this.METADATA.ID,
      presetInstanceId: '',
      headers: {
        'User-Agent': this.METADATA.USER_AGENT,
      },
    };
  }
}
