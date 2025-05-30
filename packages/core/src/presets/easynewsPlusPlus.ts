import { PresetMetadata } from '../db';
import { EasynewsPreset, EasynewsParser } from './easynews';
import { constants, Env } from '../utils';
import { baseOptions } from './preset';
import { StreamParser } from '../parser';

class EasynewsPlusPlusParser extends EasynewsParser {
  protected override get ageRegex(): RegExp {
    return /📅\s*(\d+[a-zA-Z])/;
  }
}

export class EasynewsPlusPlusPreset extends EasynewsPreset {
  static override getParser(): typeof StreamParser {
    return EasynewsPlusPlusParser;
  }

  static override get METADATA(): PresetMetadata {
    return {
      ...super.METADATA,
      ID: 'easynewsPlusPlus',
      NAME: 'Easynews++',
      DESCRIPTION: 'Easynews++ provides content from Easynews',
      URL: Env.EASYNEWS_PLUS_PLUS_URL,
      TIMEOUT: Env.DEFAULT_EASYNEWS_PLUS_PLUS_TIMEOUT || Env.DEFAULT_TIMEOUT,
      USER_AGENT:
        Env.DEFAULT_EASYNEWS_PLUS_PLUS_USER_AGENT || Env.DEFAULT_USER_AGENT,
      OPTIONS: [
        ...baseOptions(
          'Easynews++',
          super.METADATA.SUPPORTED_RESOURCES,
          Env.DEFAULT_EASYNEWS_PLUS_PLUS_TIMEOUT || Env.DEFAULT_TIMEOUT
        ),
        {
          id: 'strictTitleMatching',
          name: 'Strict Title Matching',
          description:
            "Whether to filter out results that don't match the title exactly",
          type: 'boolean',
          required: true,
          default: false,
        },
      ],
    };
  }

  protected static override generateConfig(
    easynewsCredentials: {
      username: string;
      password: string;
    },
    options: Record<string, any>
  ): string {
    return this.urlEncodeJSON({
      uiLanguage: 'eng',
      username: easynewsCredentials.username,
      password: easynewsCredentials.password,
      strictTitleMatching: options.strictTitleMatching ? 'on' : 'off',
      baseUrl: options.url
        ? new URL(options.url).origin
        : Env.EASYNEWS_PLUS_PLUS_URL,
      preferredLanguage: '',
      sortingPreference: 'quality_first',
      showQualities: '4k,1080p,720p,480p',
      maxResultsPerQuality: '',
      maxFileSize: '',
    });
  }
}
