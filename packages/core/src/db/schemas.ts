import { z } from 'zod';
import * as constants from '../utils/constants';

const ServiceIds = z.enum(constants.SERVICES);

const Resolutions = z.enum(constants.RESOLUTIONS);

const Qualities = z.enum(constants.QUALITIES);

const VisualTags = z.enum(constants.VISUAL_TAGS);

const AudioTags = z.enum(constants.AUDIO_TAGS);

const AudioChannels = z.enum(constants.AUDIO_CHANNELS);

const Encodes = z.enum(constants.ENCODES);

// const SortCriteria = z.enum(constants.SORT_CRITERIA);

// const SortDirections = z.enum(constants.SORT_DIRECTIONS);

const SortCriterion = z.object({
  key: z.enum(constants.SORT_CRITERIA),
  direction: z.enum(constants.SORT_DIRECTIONS),
});

export type SortCriterion = z.infer<typeof SortCriterion>;

const StreamTypes = z.enum(constants.STREAM_TYPES);
const Languages = z.enum(constants.LANGUAGES);

const Formatter = z.object({
  id: z.enum(constants.FORMATTERS),
  definition: z
    .object({
      name: z.string().max(5000),
      description: z.string().max(5000),
    })
    .optional(),
});

const StreamProxyConfig = z.object({
  enabled: z.boolean().optional(),
  id: z.enum(constants.PROXY_SERVICES).optional(),
  url: z.string().optional(),
  credentials: z.string().min(1).optional(),
  publicIp: z.string().ip().optional(),
  proxiedAddons: z.array(z.string().min(1)).optional(),
  proxiedServices: z.array(z.string().min(1)).optional(),
});

export type StreamProxyConfig = z.infer<typeof StreamProxyConfig>;

const ResultLimitOptions = z.object({
  global: z.number().min(1).optional(),
  service: z.number().min(1).optional(),
  addon: z.number().min(1).optional(),
  resolution: z.number().min(1).optional(),
  quality: z.number().min(1).optional(),
  streamType: z.number().min(1).optional(),
  indexer: z.number().min(1).optional(),
  releaseGroup: z.number().min(1).optional(),
});

// const SizeFilter = z.object({
//   min: z.number().min(1).optional(),
//   max: z.number().min(1).optional(),
// });
const SizeFilter = z.object({
  movies: z
    .tuple([z.number().min(0), z.number().min(0)])
    // .object({
    //   min: z.number().min(1).optional(),
    //   max: z.number().min(1).optional(),
    // })
    .optional(),
  series: z
    .tuple([z.number().min(0), z.number().min(0)])
    // .object({
    //   min: z.number().min(1).optional(),
    //   max: z.number().min(1).optional(),
    // })
    .optional(),
});

const SizeFilterOptions = z.object({
  global: SizeFilter,
  resolution: z.record(Resolutions, SizeFilter).optional(),
});

const ServiceSchema = z.object({
  id: ServiceIds,
  enabled: z.boolean().optional(),
  credentials: z.record(z.string().min(1), z.string().min(1)),
});

export type Service = z.infer<typeof ServiceSchema>;

const ServiceList = z.array(ServiceSchema);

const ResourceSchema = z.enum(constants.RESOURCES);

export type Resource = z.infer<typeof ResourceSchema>;

const ResourceList = z.array(ResourceSchema);

const AddonSchema = z.object({
  instanceId: z.string().min(1).optional(), // uniquely identifies the addon in a given list of addons
  presetType: z.string().min(1), // reference to the type of the preset that created this addon
  presetInstanceId: z.string().min(1), // reference to the instance id of the preset that created this addon
  manifestUrl: z.string().url(),
  enabled: z.boolean(),
  resources: ResourceList.optional(),
  name: z.string(),
  identifier: z.string().optional(), // true identifier for generating IDs
  displayIdentifier: z.string().optional(), // identifier for display purposes
  timeout: z.number().min(1),
  library: z.boolean().optional(),
  streamPassthrough: z.boolean().optional(),
  headers: z.record(z.string().min(1), z.string().min(1)).optional(),
  ip: z.string().ip().optional(),
});

// preset objects are transformed into addons by a preset transformer.
const PresetSchema = z.object({
  type: z.string().min(1), // the preset type e.g. 'torrentio'
  instanceId: z.string().min(1), // uniquely identifies the preset in a given list of presets
  enabled: z.boolean(),
  options: z.record(z.string().min(1), z.any()),
});

export type PresetObject = z.infer<typeof PresetSchema>;

const PresetList = z.array(PresetSchema);

export type Addon = z.infer<typeof AddonSchema>;
export type Preset = z.infer<typeof PresetSchema>;

const DeduplicatorKey = z.enum(constants.DEDUPLICATOR_KEYS);

// deduplicator options.
// can choose what keys to use for identifying duplicates.
// can choose how duplicates are removed specifically.
// we can either
// - keep only 1 result from the highest priority service from the highest priority addon (single_result)
// - keep 1 result for each enabled service from the higest priority addon (per_service)
// - keep 1 result from the highest priority service from each enabled addon (per_addon)
const DeduplicatorMode = z.enum([
  'single_result',
  'per_service',
  'per_addon',
  'disabled',
]);

const DeduplicatorOptions = z.object({
  enabled: z.boolean().optional(),
  keys: z.array(DeduplicatorKey).optional(),
  cached: DeduplicatorMode.optional(),
  uncached: DeduplicatorMode.optional(),
  p2p: DeduplicatorMode.optional(),
  http: DeduplicatorMode.optional(),
  live: DeduplicatorMode.optional(),
  youtube: DeduplicatorMode.optional(),
  external: DeduplicatorMode.optional(),
});

const OptionDefinition = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  description: z.string().min(1),
  emptyIsUndefined: z.boolean().optional(),
  type: z.enum([
    'string',
    'password',
    'number',
    'boolean',
    'select',
    'multi-select',
    'url',
    'alert',
    'socials',
  ]),
  required: z.boolean().optional(),
  default: z.any().optional(),
  // sensitive: z.boolean().optional(),
  forced: z.any().optional(),
  options: z
    .array(
      z.object({
        value: z.any(),
        label: z.string().min(1),
      })
    )
    .optional(),
  intent: z
    .enum([
      'alert',
      'info',
      'success',
      'warning',
      'info-basic',
      'success-basic',
      'warning-basic',
      'alert-basic',
    ])
    .optional(),
  socials: z
    .array(
      z.object({
        id: z.enum([
          'website',
          'github',
          'discord',
          'ko-fi',
          'patreon',
          'buymeacoffee',
          'github-sponsors',
        ]),
        url: z.string().url(),
      })
    )
    .optional(),
  constraints: z
    .object({
      min: z.number().min(1).optional(), // for string inputs, consider this the minimum length.
      max: z.number().min(1).optional(), // and for number inputs, consider this the minimum and maximum value.
    })
    .optional(),
});

export type Option = z.infer<typeof OptionDefinition>;

const NameableRegex = z.object({
  name: z.string().min(0),
  pattern: z.string().min(1),
});

const Group = z.object({
  addons: z.array(z.string().min(1)).min(1),
  condition: z.string().min(1).max(200),
});

export type Group = z.infer<typeof Group>;

// Resolution, Quality, Encode, Visual Tag, Audio Tag, Stream Type, Keyword, Regex, Cached, Uncached, Size

const CatalogModification = z.object({
  id: z.string().min(1), // an id that maps to an actual catalog ID
  type: z.string().min(1), // the type of catalog modification
  name: z.string().min(1).optional(), // override the name of the catalog
  shuffle: z.boolean().optional(), // shuffle the catalog
  persistShuffleFor: z.number().min(0).max(24).optional(), // persist the shuffle for a given amount of time (in hours)
  onlyOnDiscover: z.boolean().optional(), // only show the catalog on the discover page
  enabled: z.boolean().optional(), // enable or disable the catalog
  rpdb: z.boolean().optional(), // use rpdb for posters if supported
  overrideType: z.string().min(1).optional(), // override the type of the catalog
  hideable: z.boolean().optional(), // hide the catalog from the home page
  addonName: z.string().min(1).optional(), // the name of the addon that provides the catalog
});

export const UserDataSchema = z.object({
  uuid: z.string().uuid().optional(),
  encryptedPassword: z.string().min(1).optional(),
  trusted: z.boolean().optional(),
  addonPassword: z.string().min(1).optional(),
  ip: z.string().ip().optional(),
  addonName: z.string().min(1).max(300).optional(),
  addonLogo: z.string().url().optional(),
  addonBackground: z.string().url().optional(),
  addonDescription: z.string().min(1).optional(),
  excludedResolutions: z.array(Resolutions).optional(),
  includedResolutions: z.array(Resolutions).optional(),
  requiredResolutions: z.array(Resolutions).optional(),
  preferredResolutions: z.array(Resolutions).optional(),
  excludedQualities: z.array(Qualities).optional(),
  includedQualities: z.array(Qualities).optional(),
  requiredQualities: z.array(Qualities).optional(),
  preferredQualities: z.array(Qualities).optional(),
  excludedLanguages: z.array(Languages).optional(),
  includedLanguages: z.array(Languages).optional(),
  requiredLanguages: z.array(Languages).optional(),
  preferredLanguages: z.array(Languages).optional(),
  excludedVisualTags: z.array(VisualTags).optional(),
  includedVisualTags: z.array(VisualTags).optional(),
  requiredVisualTags: z.array(VisualTags).optional(),
  preferredVisualTags: z.array(VisualTags).optional(),
  excludedAudioTags: z.array(AudioTags).optional(),
  includedAudioTags: z.array(AudioTags).optional(),
  requiredAudioTags: z.array(AudioTags).optional(),
  preferredAudioTags: z.array(AudioTags).optional(),
  excludedAudioChannels: z.array(AudioChannels).optional(),
  includedAudioChannels: z.array(AudioChannels).optional(),
  requiredAudioChannels: z.array(AudioChannels).optional(),
  preferredAudioChannels: z.array(AudioChannels).optional(),
  excludedStreamTypes: z.array(StreamTypes).optional(),
  includedStreamTypes: z.array(StreamTypes).optional(),
  requiredStreamTypes: z.array(StreamTypes).optional(),
  preferredStreamTypes: z.array(StreamTypes).optional(),
  excludedEncodes: z.array(Encodes).optional(),
  includedEncodes: z.array(Encodes).optional(),
  requiredEncodes: z.array(Encodes).optional(),
  preferredEncodes: z.array(Encodes).optional(),
  excludedRegexPatterns: z.array(z.string().min(1)).optional(),
  includedRegexPatterns: z.array(z.string().min(1)).optional(),
  requiredRegexPatterns: z.array(z.string().min(1)).optional(),
  preferredRegexPatterns: z.array(NameableRegex).optional(),
  requiredKeywords: z.array(z.string().min(1)).optional(),
  includedKeywords: z.array(z.string().min(1)).optional(),
  excludedKeywords: z.array(z.string().min(1)).optional(),
  preferredKeywords: z.array(z.string().min(1)).optional(),
  randomiseResults: z.boolean().optional(),
  enhanceResults: z.boolean().optional(),
  enhancePosters: z.boolean().optional(),
  excludeSeederRange: z
    .tuple([z.number().min(0), z.number().min(0)])
    .optional(),
  includeSeederRange: z
    .tuple([z.number().min(0), z.number().min(0)])
    .optional(),
  requiredSeederRange: z
    .tuple([z.number().min(0), z.number().min(0)])
    .optional(),
  seederRangeTypes: z.array(z.enum(['p2p', 'cached', 'uncached'])).optional(),
  excludeCached: z.boolean().optional(),
  excludeCachedFromAddons: z.array(z.string().min(1)).optional(),
  excludeCachedFromServices: z.array(z.string().min(1)).optional(),
  excludeCachedFromStreamTypes: z.array(StreamTypes).optional(),
  excludeCachedMode: z.enum(['or', 'and']).optional(),
  excludeUncached: z.boolean().optional(),
  excludeUncachedFromAddons: z.array(z.string().min(1)).optional(),
  excludeUncachedFromServices: z.array(z.string().min(1)).optional(),
  excludeUncachedFromStreamTypes: z.array(StreamTypes).optional(),
  excludeUncachedMode: z.enum(['or', 'and']).optional(),
  excludedFilterConditions: z.array(z.string().min(1).max(1000)).optional(),
  groups: z
    .array(
      z.object({
        addons: z.array(z.string().min(1)),
        condition: z.string().min(1).max(200),
      })
    )
    .optional(),
  sortCriteria: z.object({
    // global must be defined.
    global: z.array(SortCriterion),
    // results must be from either a movie or series search, so we can safely apply different sort criteria.
    movies: z.array(SortCriterion).optional(),
    series: z.array(SortCriterion).optional(),
    anime: z.array(SortCriterion).optional(),
    // cached and uncached results are a sort criteria themselves, so this can only be applied when cache is high enough in the global
    // sort criteria, and we would have to split the results into two (cached and uncached) lists, and then apply both sort criteria below
    // and then merge the results.
    cached: z.array(SortCriterion).optional(),
    uncached: z.array(SortCriterion).optional(),
    cachedMovies: z.array(SortCriterion).optional(),
    uncachedMovies: z.array(SortCriterion).optional(),
    cachedSeries: z.array(SortCriterion).optional(),
    uncachedSeries: z.array(SortCriterion).optional(),
    cachedAnime: z.array(SortCriterion).optional(),
    uncachedAnime: z.array(SortCriterion).optional(),
  }),
  rpdbApiKey: z.string().optional(),
  formatter: Formatter,
  proxy: StreamProxyConfig.optional(),
  resultLimits: ResultLimitOptions.optional(),
  size: SizeFilterOptions.optional(),
  hideErrors: z.boolean().optional(),
  hideErrorsForResources: z.array(ResourceSchema).optional(),
  tmdbAccessToken: z.string().optional(),
  titleMatching: z
    .object({
      mode: z.enum(['exact', 'contains']).optional(),
      matchYear: z.boolean().optional(),
      enabled: z.boolean().optional(),
      requestTypes: z.array(z.string()).optional(),
      addons: z.array(z.string()).optional(),
    })
    .optional(),
  seasonEpisodeMatching: z
    .object({
      enabled: z.boolean().optional(),
      requestTypes: z.array(z.string()).optional(),
      addons: z.array(z.string()).optional(),
    })
    .optional(),
  deduplicator: DeduplicatorOptions.optional(),
  precacheNextEpisode: z.boolean().optional(),
  services: ServiceList.optional(),
  presets: PresetList,
  catalogModifications: z.array(CatalogModification).optional(),
  externalDownloads: z.boolean().optional(),
});

export type UserData = z.infer<typeof UserDataSchema>;

export const TABLES = {
  USERS: `
      uuid TEXT PRIMARY KEY,
      password_hash TEXT NOT NULL,
      config TEXT NOT NULL,
      config_salt TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT (CURRENT_TIMESTAMP),
      updated_at TIMESTAMP DEFAULT (CURRENT_TIMESTAMP),
      accessed_at TIMESTAMP DEFAULT (CURRENT_TIMESTAMP)
    `,
};

const strictManifestResourceSchema = z.object({
  name: z.enum(constants.RESOURCES),
  types: z.array(z.string()),
  idPrefixes: z.array(z.string().min(1)).optional(),
});

export type StrictManifestResource = z.infer<
  typeof strictManifestResourceSchema
>;

const ManifestResourceSchema = z.union([
  z.string(),
  strictManifestResourceSchema,
]);

const ManifestExtraSchema = z.object({
  name: z.string().min(1),
  isRequired: z.boolean().optional(),
  options: z.array(z.string()).optional(),
  optionsLimit: z.number().min(1).optional(),
});
const ManifestCatalogSchema = z.object({
  type: z.string(),
  id: z.string().min(1),
  name: z.string().min(1),
  extra: z.array(ManifestExtraSchema).optional(),
});

const AddonCatalogDefinitionSchema = z.object({
  type: z.string(),
  id: z.string().min(1),
  name: z.string().min(1),
});

export const ManifestSchema = z
  .object({
    id: z.string().min(1),
    name: z.string().min(1),
    description: z.string().min(1),
    version: z.string().min(1),
    types: z.array(z.string()).optional(),
    idPrefixes: z.array(z.string().min(1)).optional(),
    resources: z.array(ManifestResourceSchema),
    catalogs: z.array(ManifestCatalogSchema),
    addonCatalogs: z.array(AddonCatalogDefinitionSchema).optional(),
    background: z.string().min(1).or(z.null()).optional(),
    logo: z.string().or(z.null()).optional(),
    contactEmail: z.string().min(1).or(z.null()).optional(),
    behaviorHints: z
      .object({
        adult: z.boolean().optional(),
        p2p: z.boolean().optional(),
        configurable: z.boolean().optional(),
        configurationRequired: z.boolean().optional(),
      })
      .optional(),
    // not part of the manifest scheme, but needed for stremio-addons.net
    stremioAddonsConfig: z
      .object({
        issuer: z.string().min(1),
        signature: z.string().min(1),
      })
      .optional(),
  })
  .passthrough();

export type Manifest = z.infer<typeof ManifestSchema>;

export const SubtitleSchema = z
  .object({
    id: z.string().min(1),
    url: z.string().url(),
    lang: z.string().min(1),
  })
  .passthrough();

export const SubtitleResponseSchema = z.object({
  subtitles: z.array(SubtitleSchema),
});
export type SubtitleResponse = z.infer<typeof SubtitleResponseSchema>;
export type Subtitle = z.infer<typeof SubtitleSchema>;

export const StreamSchema = z
  .object({
    url: z.string().url().or(z.null()).optional(),
    ytId: z.string().min(1).or(z.null()).optional(),
    infoHash: z.string().min(1).or(z.null()).optional(),
    fileIdx: z.number().or(z.null()).optional(),
    externalUrl: z.string().min(1).or(z.null()).optional(),
    name: z.string().min(1).or(z.null()).optional(),
    title: z.string().min(1).or(z.null()).optional(),
    description: z.string().min(1).or(z.null()).optional(),
    subtitles: z.array(SubtitleSchema).or(z.null()).optional(),
    sources: z.array(z.string().min(1)).or(z.null()).optional(),
    behaviorHints: z
      .object({
        countryWhitelist: z.array(z.string().length(3)).or(z.null()).optional(),
        notWebReady: z.boolean().or(z.null()).optional(),
        bingeGroup: z.string().min(1).or(z.null()).optional(),
        proxyHeaders: z
          .object({
            request: z.record(z.string().min(1), z.string().min(1)).optional(),
            response: z.record(z.string().min(1), z.string().min(1)).optional(),
          })
          .optional(),
        videoHash: z.string().min(1).or(z.null()).optional(),
        videoSize: z.number().or(z.null()).optional(),
        filename: z.string().min(1).or(z.null()).optional(),
      })
      .optional(),
  })
  .passthrough();

export const StreamResponseSchema = z.object({
  streams: z.array(StreamSchema),
});

export type StreamResponse = z.infer<typeof StreamResponseSchema>;

export type Stream = z.infer<typeof StreamSchema>;

const TrailerSchema = z
  .object({
    source: z.string().min(1),
    type: z.enum(['Trailer']),
  })
  .passthrough();

const MetaLinkSchema = z
  .object({
    name: z.string().min(1),
    category: z.string().min(1),
    url: z.string().url().or(z.string().startsWith('stremio:///')),
  })
  .passthrough();

const MetaVideoSchema = z
  .object({
    id: z.string().min(1),
    title: z.string().or(z.null()).optional(),
    name: z.string().or(z.null()).optional(),
    released: z.string().datetime().or(z.null()).optional(),
    thumbnail: z.string().url().or(z.null()).optional(),
    streams: z.array(StreamSchema).or(z.null()).optional(),
    available: z.boolean().or(z.null()).optional(),
    episode: z.number().or(z.null()).optional(),
    season: z.number().or(z.null()).optional(),
    trailers: z.array(TrailerSchema).or(z.null()).optional(),
    overview: z.string().or(z.null()).optional(),
  })
  .passthrough();

export const MetaPreviewSchema = z
  .object({
    id: z.string().min(1),
    type: z.string().min(1),
    name: z.string().or(z.null()).optional(),
    poster: z.string().or(z.null()).optional(),
    posterShape: z
      .enum(['square', 'poster', 'landscape', 'regular'])
      .optional(),
    // discover sidebar
    //@deprecated use links instead
    genres: z.array(z.string()).or(z.null()).optional(),
    imdbRating: z.string().or(z.null()).or(z.number()).optional(),
    releaseInfo: z.string().or(z.number()).or(z.null()).optional(),
    //@deprecated
    director: z.array(z.string()).or(z.null()).optional(),
    //@deprecated
    cast: z.array(z.string()).or(z.null()).optional(),
    // background: z.string().min(1).optional(),
    // logo: z.string().min(1).optional(),
    description: z.string().or(z.null()).optional(),
    trailers: z.array(TrailerSchema).or(z.null()).optional(),
    links: z.array(MetaLinkSchema).or(z.null()).optional(),
    // released: z.string().datetime().optional(),
  })
  .passthrough();

export const MetaSchema = MetaPreviewSchema.extend({
  poster: z.string().or(z.null()).optional(),
  background: z.string().or(z.null()).optional(),
  logo: z.string().or(z.null()).optional(),
  videos: z.array(MetaVideoSchema).or(z.null()).optional(),
  runtime: z.coerce.string().or(z.null()).optional(),
  language: z.string().or(z.null()).optional(),
  country: z.string().or(z.null()).optional(),
  awards: z.string().or(z.null()).optional(),
  website: z.string().url().or(z.null()).optional(),
  behaviorHints: z
    .object({
      defaultVideoId: z.string().or(z.null()).optional(),
    })
    .optional(),
}).passthrough();

export const MetaResponseSchema = z.object({
  meta: MetaSchema,
});
export const CatalogResponseSchema = z.object({
  metas: z.array(MetaPreviewSchema),
});
export type MetaResponse = z.infer<typeof MetaResponseSchema>;
export type CatalogResponse = z.infer<typeof CatalogResponseSchema>;
export type Meta = z.infer<typeof MetaSchema>;
export type MetaPreview = z.infer<typeof MetaPreviewSchema>;

export const AddonCatalogSchema = z
  .object({
    transportName: z.literal('http'),
    transportUrl: z.string().url(),
    manifest: ManifestSchema,
  })
  .passthrough();
export const AddonCatalogResponseSchema = z.object({
  addons: z.array(AddonCatalogSchema),
});
export type AddonCatalogResponse = z.infer<typeof AddonCatalogResponseSchema>;
export type AddonCatalog = z.infer<typeof AddonCatalogSchema>;

const ParsedFileSchema = z.object({
  releaseGroup: z.string().optional(),
  resolution: z.string().optional(),
  quality: z.string().optional(),
  encode: z.string().optional(),
  audioChannels: z.array(z.string()),
  visualTags: z.array(z.string()),
  audioTags: z.array(z.string()),
  languages: z.array(z.string()),
  title: z.string().optional(),
  year: z.coerce.string().optional(),
  season: z.number().optional(),
  seasons: z.array(z.number()).optional(),
  episode: z.number().optional(),
  seasonEpisode: z.array(z.string()).optional(),
});

export type ParsedFile = z.infer<typeof ParsedFileSchema>;

export const ParsedStreamSchema = z.object({
  id: z.string().min(1),
  proxied: z.boolean().optional(),
  addon: AddonSchema,
  parsedFile: ParsedFileSchema.optional(),
  message: z.string().max(1000).optional(),
  regexMatched: z
    .object({
      name: z.string().min(1).optional(),
      pattern: z.string().min(1).optional(),
      index: z.number(),
    })
    .optional(),
  keywordMatched: z.boolean().optional(),
  size: z.number().optional(),
  folderSize: z.number().optional(),
  type: StreamTypes,
  indexer: z.string().optional(),
  age: z.string().optional(),
  torrent: z
    .object({
      infoHash: z.string().min(1).optional(),
      fileIdx: z.number().optional(),
      seeders: z.number().optional(),
      sources: z.array(z.string().min(1)).optional(), // array of tracker urls and DHT nodes
    })
    .optional(),
  countryWhitelist: z.array(z.string().length(3)).optional(),
  notWebReady: z.boolean().optional(),
  bingeGroup: z.string().min(1).optional(),
  requestHeaders: z.record(z.string().min(1), z.string().min(1)).optional(),
  responseHeaders: z.record(z.string().min(1), z.string().min(1)).optional(),
  videoHash: z.string().min(1).optional(),
  subtitles: z.array(SubtitleSchema).optional(),
  filename: z.string().optional(),
  folderName: z.string().optional(),
  service: z
    .object({
      id: z.enum(constants.SERVICES),
      cached: z.boolean(),
    })
    .optional(),
  duration: z.number().optional(),
  library: z.boolean().optional(),
  url: z.string().url().optional(),
  ytId: z.string().min(1).optional(),
  externalUrl: z.string().min(1).optional(),
  error: z
    .object({
      title: z.string().min(1),
      description: z.string().min(1),
    })
    .optional(),
  originalName: z.string().optional(),
  originalDescription: z.string().optional(),
});

export const ParsedStreams = z.array(ParsedStreamSchema);

export type ParsedStream = z.infer<typeof ParsedStreamSchema>;
export type ParsedStreams = z.infer<typeof ParsedStreams>;

export const AIOStream = StreamSchema.extend({
  streamData: z.object({
    error: z
      .object({
        title: z.string().min(1),
        description: z.string().min(1),
      })
      .optional(),
    proxied: z.boolean().optional(),
    addon: z.string().optional(),
    filename: z.string().optional(),
    folderName: z.string().optional(),
    service: z
      .object({
        id: z.enum(constants.SERVICES),
        cached: z.boolean(),
      })
      .optional(),
    parsedFile: ParsedFileSchema.optional(),
    message: z.string().max(1000).optional(),
    regexMatched: z
      .object({
        name: z.string().min(1).optional(),
        pattern: z.string().min(1).optional(),
        index: z.number(),
      })
      .optional(),
    keywordMatched: z.boolean().optional(),
    size: z.number().optional(),
    folderSize: z.number().optional(),
    type: StreamTypes.optional(),
    indexer: z.string().optional(),
    age: z.string().optional(),
    torrent: z
      .object({
        infoHash: z.string().min(1).optional(),
        fileIdx: z.number().optional(),
        seeders: z.number().optional(),
        sources: z.array(z.string().min(1)).optional(), // array of tracker urls and DHT nodes
      })
      .optional(),
    duration: z.number().optional(),
    library: z.boolean().optional(),
  }),
});

export type AIOStream = z.infer<typeof AIOStream>;

const AIOStreamResponseSchema = z.object({
  streams: z.array(AIOStream),
});
export type AIOStreamResponse = z.infer<typeof AIOStreamResponseSchema>;

const PresetMetadataSchema = z.object({
  ID: z.string(),
  NAME: z.string(),
  DISABLED: z
    .object({
      reason: z.string(),
      disabled: z.boolean(),
    })
    .optional(),
  LOGO: z.string().optional(),
  DESCRIPTION: z.string(),
  URL: z.string(),
  TIMEOUT: z.number(),
  USER_AGENT: z.string(),
  SUPPORTED_SERVICES: z.array(z.string()),
  OPTIONS: z.array(OptionDefinition),
  SUPPORTED_STREAM_TYPES: z.array(StreamTypes),
  SUPPORTED_RESOURCES: z.array(ResourceSchema),
});

const PresetMinimalMetadataSchema = z.object({
  ID: z.string(),
  NAME: z.string(),
  LOGO: z.string().optional(),
  DESCRIPTION: z.string(),
  URL: z.string(),
  DISABLED: z
    .object({
      reason: z.string(),
      disabled: z.boolean(),
    })
    .optional(),
  SUPPORTED_RESOURCES: z.array(ResourceSchema),
  SUPPORTED_STREAM_TYPES: z.array(StreamTypes),
  SUPPORTED_SERVICES: z.array(z.string()),
  OPTIONS: z.array(OptionDefinition),
});

const StatusResponseSchema = z.object({
  version: z.string(),
  tag: z.string(),
  commit: z.string(),
  buildTime: z.string(),
  commitTime: z.string(),
  users: z.number(),
  settings: z.object({
    baseUrl: z.string().url().optional(),
    addonName: z.string(),
    customHtml: z.string().optional(),
    protected: z.boolean(),
    regexFilterAccess: z.enum(['none', 'trusted', 'all']),
    tmdbApiAvailable: z.boolean(),
    forced: z.object({
      proxy: z.object({
        enabled: z.boolean().or(z.null()),
        id: z.string().or(z.null()),
        url: z.string().or(z.null()),
        publicIp: z.string().or(z.null()),
        credentials: z.string().or(z.null()),
        disableProxiedAddons: z.boolean(),
        proxiedServices: z.array(z.string()).or(z.null()),
      }),
    }),
    defaults: z.object({
      proxy: z.object({
        enabled: z.boolean().or(z.null()),
        id: z.string().or(z.null()),
        url: z.string().or(z.null()),
        publicIp: z.string().or(z.null()),
        credentials: z.string().or(z.null()),
        proxiedServices: z.array(z.string()).or(z.null()),
      }),
      timeout: z.number().or(z.null()),
    }),
    presets: z.array(PresetMinimalMetadataSchema),
    services: z.record(
      z.enum(constants.SERVICES),
      z.object({
        id: z.enum(constants.SERVICES),
        name: z.string(),
        shortName: z.string(),
        knownNames: z.array(z.string()),
        signUpText: z.string(),
        credentials: z.array(OptionDefinition),
      })
    ),
  }),
});

export type StatusResponse = z.infer<typeof StatusResponseSchema>;
export type PresetMetadata = z.infer<typeof PresetMetadataSchema>;
export type PresetMinimalMetadata = z.infer<typeof PresetMinimalMetadataSchema>;

export const RPDBIsValidResponse = z.object({
  valid: z.boolean(),
});
export type RPDBIsValidResponse = z.infer<typeof RPDBIsValidResponse>;
