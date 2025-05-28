import { z } from 'zod';
import * as constants from '../utils/constants';

const ServiceIds = z.enum(constants.SERVICES);

const Resolutions = z.enum(constants.RESOLUTIONS);

const Qualities = z.enum(constants.QUALITIES);

const VisualTags = z.enum(constants.VISUAL_TAGS);

const AudioTags = z.enum(constants.AUDIO_TAGS);

const Encodes = z.enum(constants.ENCODES);

const SortCriteria = z.enum(constants.SORT_CRITERIA);

const SortDirections = z.enum(constants.SORT_DIRECTIONS);
const StreamTypes = z.enum(constants.STREAM_TYPES);
const Languages = z.enum(constants.LANGUAGES);

const Formatter = z.object({
  id: z.enum(constants.FORMATTERS),
  definition: z
    .object({
      name: z.string().min(1),
      description: z.string().min(1),
    })
    .optional(),
});

const StreamProxyConfig = z.object({
  enabled: z.boolean().optional(),
  id: z.enum(constants.PROXY_SERVICES),
  url: z.string().url(),
  credentials: z.string().min(1),
  publicIp: z.string().min(1).optional(),
  proxiedAddons: z.array(z.string().min(1)),
  proxiedServices: z.array(z.string().min(1)),
});

export type StreamProxyConfig = z.infer<typeof StreamProxyConfig>;

const ResultLimitOptions = z.object({
  global: z.number().min(1).optional(),
  service: z.number().min(1).optional(),
  addon: z.number().min(1).optional(),
  resolution: z.number().min(1).optional(),
  quality: z.number().min(1).optional(),
  language: z.number().min(1).optional(),
  visualTag: z.number().min(1).optional(),
  audioTag: z.number().min(1).optional(),
  streamType: z.number().min(1).optional(),
  encode: z.number().min(1).optional(),
  regexPattern: z.number().min(1).optional(),
});

const SizeFilter = z.object({
  movies: z
    .object({
      min: z.number().min(1).optional(),
      max: z.number().min(1).optional(),
    })
    .optional(),
  series: z
    .object({
      min: z.number().min(1).optional(),
      max: z.number().min(1).optional(),
    })
    .optional(),
});

const SizeFilterOptions = z.object({
  global: SizeFilter.optional(),
  service: SizeFilter.optional(),
  addon: SizeFilter.optional(),
  resolution: SizeFilter.optional(),
});

const ServiceSchema = z.object({
  id: ServiceIds,
  enabled: z.boolean().optional(),
  credentials: z.record(z.string().min(1), z.string().min(1)).optional(),
});

export type Service = z.infer<typeof ServiceSchema>;

const ServiceList = z.array(ServiceSchema);

const ResourceSchema = z.enum(constants.RESOURCES);

export type Resource = z.infer<typeof ResourceSchema>;

const ResourceList = z.array(ResourceSchema);

const AddonSchema = z.object({
  manifestUrl: z.string().url(),
  enabled: z.boolean(),
  resources: ResourceList.optional(),
  name: z.string().min(1),
  timeout: z.number().min(1),
  library: z.boolean().optional(),
  fromPresetId: z.string().min(1).optional(),
  headers: z.record(z.string().min(1), z.string().min(1)).optional(),
  ip: z.string().ip().optional(),
});

// preset objects are transformed into addons by a preset transformer.
const PresetSchema = z.object({
  id: z.string().min(1),
  enabled: z.boolean(),
  options: z.record(z.string().min(1), z.any()),
});

export type PresetObject = z.infer<typeof PresetSchema>;

const AddonList = z.array(AddonSchema);
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
const DeduplicatorMode = z.enum(['single_result', 'per_service', 'per_addon']);

const DeduplicatorTypeOptions = z.object({
  enabled: z.boolean().optional(),
  mode: DeduplicatorMode.optional(),
});

const DeduplicatorOptions = z.object({
  enabled: z.boolean().optional(),
  keys: z.array(DeduplicatorKey).optional(),
  cached: DeduplicatorTypeOptions.optional(),
  uncached: DeduplicatorTypeOptions.optional(),
  p2p: DeduplicatorTypeOptions.optional(),
  http: DeduplicatorTypeOptions.optional(),
});

const OptionDefinition = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  description: z.string().min(1),
  type: z.enum([
    'string',
    'number',
    'boolean',
    'select',
    'multi-select',
    'url',
  ]),
  required: z.boolean().optional(),
  default: z.any().optional(),
  sensitive: z.boolean().optional(),
  options: z
    .array(
      z.object({
        value: z.any(),
        label: z.string().min(1),
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
  name: z.string().min(1),
  pattern: z.string().regex(/^.*$/),
});

export const UserDataSchema = z.object({
  uuid: z.string().uuid().optional(),
  admin: z.boolean().optional(),
  apiKey: z.string().min(1).optional(),
  ip: z.string().ip().optional(),
  addonName: z.string().min(1).optional(),
  addonLogo: z.string().url().optional(),
  addonBackground: z.string().url().optional(),
  addonDescription: z.string().min(1).optional(),
  excludedResolutions: z.array(Resolutions).optional(),
  requiredResolutions: z.array(Resolutions).optional(),
  preferredResolutions: z.array(Resolutions).optional(),
  excludedQualities: z.array(Qualities).optional(),
  requiredQualities: z.array(Qualities).optional(),
  preferredQualities: z.array(Qualities).optional(),
  excludedLanguages: z.array(Languages).optional(),
  requiredLanguages: z.array(Languages).optional(),
  preferredLanguages: z.array(Languages).optional(),
  excludedVisualTags: z.array(VisualTags).optional(),
  requiredVisualTags: z.array(VisualTags).optional(),
  preferredVisualTags: z.array(VisualTags).optional(),
  excludedAudioTags: z.array(AudioTags).optional(),
  requiredAudioTags: z.array(AudioTags).optional(),
  preferredAudioTags: z.array(AudioTags).optional(),
  excludedStreamTypes: z.array(StreamTypes).optional(),
  requiredStreamTypes: z.array(StreamTypes).optional(),
  preferredStreamTypes: z.array(StreamTypes).optional(),
  excludedEncodes: z.array(Encodes).optional(),
  requiredEncodes: z.array(Encodes).optional(),
  preferredEncodes: z.array(Encodes).optional(),
  requiredRegexPatterns: z.array(z.string().min(1)).optional(),
  excludedRegexPatterns: z.array(z.string().min(1)).optional(),
  preferredRegexPatterns: z.array(NameableRegex).optional(),

  sortCriteria: z
    .object({
      // global must be defined.
      global: z.array(z.tuple([SortCriteria, SortDirections.optional()])),
      // results must be from either a movie or series search, so we can safely apply different sort criteria.
      movies: z
        .array(z.tuple([SortCriteria, SortDirections.optional()]))
        .optional(),
      series: z
        .array(z.tuple([SortCriteria, SortDirections.optional()]))
        .optional(),
      // cached and uncached results are a sort criteria themselves, so this can only be applied when cache is high enough in the global
      // sort criteria, and we would have to split the results into two (cached and uncached) lists, and then apply both sort criteria below
      // and then merge the results.
      cached: z
        .array(z.tuple([SortCriteria, SortDirections.optional()]))
        .optional(),
      uncached: z
        .array(z.tuple([SortCriteria, SortDirections.optional()]))
        .optional(),
    })
    .optional(),
  formatter: Formatter,
  proxy: StreamProxyConfig.optional(),
  resultLimiterOptions: ResultLimitOptions.optional(),
  sizeFilters: SizeFilterOptions.optional(),
  hideErrors: z.boolean().optional(),
  strictTitleMatching: z.boolean().optional(),
  deduplicator: DeduplicatorOptions.optional(),
  precacheNextEpisode: z.boolean().optional(),
  hideZeroSeederResults: z.boolean().optional(),
  services: ServiceList.optional(),
  presets: PresetList,
});

export type UserData = z.infer<typeof UserDataSchema>;

export const TABLES = {
  USERS: `
      uuid TEXT PRIMARY KEY,
      password_hash TEXT NOT NULL,
      config TEXT NOT NULL,
      config_salt TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      accessed_at DATETIME DEFAULT CURRENT_TIMESTAMP
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

export const ManifestSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  description: z.string().min(1),
  version: z.string().min(1),
  types: z.array(z.string()),
  idPrefixes: z.array(z.string().min(1)).optional(),
  resources: z.array(ManifestResourceSchema),
  catalogs: z.array(ManifestCatalogSchema),
  addonCatalogs: z.array(AddonCatalogDefinitionSchema).optional(),
  background: z.string().min(1).optional(),
  logo: z.string().min(1).optional(),
  contactEmail: z.string().min(1).optional(),
  behaviorHints: z.object({
    adult: z.boolean().optional(),
    p2p: z.boolean().optional(),
    configurable: z.boolean().optional(),
    configurationRequired: z.boolean().optional(),
  }),
  // not part of the manifest scheme, but needed for stremio-addons.net
  stremioAddonsConfig: z
    .object({
      issuer: z.string().min(1),
      signature: z.string().min(1),
    })
    .optional(),
});

export type Manifest = z.infer<typeof ManifestSchema>;

const SubtitleSchema = z.object({
  id: z.string().min(1),
  url: z.string().url(),
  lang: z.string().min(1),
});

export const SubtitleResponseSchema = z.object({
  subtitles: z.array(SubtitleSchema),
});
export type SubtitleResponse = z.infer<typeof SubtitleResponseSchema>;
export type Subtitle = z.infer<typeof SubtitleSchema>;

const StreamSchema = z.object({
  url: z.string().url().optional(),
  ytId: z.string().min(1).optional(),
  infoHash: z.string().min(1).optional(),
  fileIdx: z.number().optional(),
  externalUrl: z.string().min(1).optional(),

  name: z.string().min(1).optional(),
  title: z.string().min(1).optional(),
  description: z.string().min(1).optional(),
  subtitles: z.array(SubtitleSchema).optional(),
  sources: z.array(z.string().min(1)).optional(),
  behaviorHints: z
    .object({
      countryWhitelist: z.array(z.string().length(3)).optional(),
      notWebReady: z.boolean().optional(),
      bingeGroup: z.string().min(1).optional(),
      proxyHeaders: z
        .object({
          request: z.record(z.string().min(1), z.string().min(1)).optional(),
          response: z.record(z.string().min(1), z.string().min(1)).optional(),
        })
        .optional(),
      videoHash: z.string().min(1).optional(),
      videoSize: z.number().optional(),
      filename: z.string().min(1).optional(),
    })
    .optional(),
});

export const StreamResponseSchema = z.object({
  streams: z.array(StreamSchema),
});

export type StreamResponse = z.infer<typeof StreamResponseSchema>;

export type Stream = z.infer<typeof StreamSchema>;

const TrailerSchema = z.object({
  source: z.string().min(1),
  type: z.enum(['Trailer']),
});

const MetaLinkSchema = z.object({
  name: z.string().min(1),
  category: z.string().min(1),
  url: z.string().url().or(z.string().startsWith('stremio:///')),
});

const MetaVideoSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  released: z.string().datetime(),
  thumbnail: z.string().url().optional(),
  streams: z.array(StreamSchema).optional(),
  available: z.boolean().optional(),
  episode: z.number().optional(),
  season: z.number().optional(),
  trailers: z.array(TrailerSchema).optional(),
  overview: z.string().min(1).optional(),
});

const MetaPreviewSchema = z.object({
  id: z.string().min(1),
  type: z.string().min(1),
  name: z.string().min(1),
  poster: z.string().optional(),
  posterShape: z.enum(['square', 'poster', 'landscape']).optional(),
  // discover sidebar
  //@deprecated use links instead
  genres: z.array(z.string()).optional(),
  imdbRating: z.string().or(z.null()).optional(),
  releaseInfo: z.string().or(z.null()).optional(),
  //@deprecated
  director: z.array(z.string()).or(z.null()).optional(),
  //@deprecated
  cast: z.array(z.string()).or(z.null()).optional(),
  // background: z.string().min(1).optional(),
  // logo: z.string().min(1).optional(),
  description: z.string().optional(),
  trailers: z.array(TrailerSchema).optional(),
  links: z.array(MetaLinkSchema).optional(),
  // released: z.string().datetime().optional(),
});

const MetaSchema = MetaPreviewSchema.extend({
  poster: z.string().min(1).optional(),
  background: z.string().min(1).optional(),
  logo: z.string().min(1).optional(),
  videos: z.array(MetaVideoSchema).optional(),
  runtime: z.string().min(1).optional(),
  language: z.string().min(1).optional(),
  country: z.string().length(3).optional(),
  awards: z.string().min(1).optional(),
  website: z.string().url().optional(),
  behaviorHints: z
    .object({
      defaultVideoId: z.string().min(1).optional(),
    })
    .optional(),
});

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

const AddonCatalogSchema = z.object({
  transportName: z.literal('http'),
  transportUrl: z.string().url(),
  manifest: ManifestSchema,
});
export const AddonCatalogResponseSchema = z.object({
  addons: z.array(AddonCatalogSchema),
});
export type AddonCatalogResponse = z.infer<typeof AddonCatalogResponseSchema>;
export type AddonCatalog = z.infer<typeof AddonCatalogSchema>;

const ParsedFileSchema = z.object({
  releaseGroup: z.string().min(1).optional(),
  resolution: z.string().min(1).optional(),
  quality: z.string().min(1).optional(),
  encode: z.string().min(1).optional(),
  visualTags: z.array(z.string()).optional(),
  audioTags: z.array(z.string()).optional(),
  languages: z.array(z.string()).optional(),
  title: z.string().min(1).optional(),
  year: z.string().min(1).optional(),
  season: z.number().optional(),
  seasons: z.array(z.number()).optional(),
  episode: z.number().optional(),
});

export type ParsedFile = z.infer<typeof ParsedFileSchema>;

export const ParsedStreamSchema = z.object({
  proxied: z.boolean().optional(),
  addon: AddonSchema,
  parsedFile: ParsedFileSchema,
  message: z.string().min(1).max(1000).optional(),
  regexMatched: z
    .object({
      name: z.string().min(1).optional(),
      pattern: z.string().min(1).optional(),
      index: z.number().optional(),
    })
    .optional(),
  size: z.number().optional(),
  type: StreamTypes,
  indexer: z.string().min(1).optional(),
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
  filename: z.string().min(1).optional(),
  folderName: z.string().min(1).optional(),
  service: z
    .object({
      id: z.enum(constants.SERVICES),
      cached: z.boolean(),
    })
    .optional(),
  duration: z.number().optional(),
  inLibrary: z.boolean().optional(),
  url: z.string().url().optional(),
  ytId: z.string().min(1).optional(),
  externalUrl: z.string().min(1).optional(),
});

export type ParsedStream = z.infer<typeof ParsedStreamSchema>;

const PresetMetadataSchema = z.object({
  ID: z.string(),
  NAME: z.string(),
  LOGO: z.string(),
  DESCRIPTION: z.string(),
  URL: z.string(),
  TIMEOUT: z.number(),
  USER_AGENT: z.string(),
  SUPPORTED_SERVICES: z.array(z.string()),
  OPTIONS: z.array(OptionDefinition),
  SUPPORTED_STREAM_TYPES: z.array(StreamTypes),
  SUPPORTED_RESOURCES: z.array(ResourceSchema),
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
    disabledAddons: z.array(z.string()),
    disabledServices: z.array(z.string()),
    forced: z.object({
      proxy: z.object({
        enabled: z.boolean().or(z.null()),
        id: z.string().or(z.null()),
        url: z.string().or(z.null()),
        publicIp: z.string().or(z.null()),
        credentials: z.string().or(z.null()),
        proxiedAddons: z.array(z.string()).or(z.null()),
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
        proxiedAddons: z.array(z.string()).or(z.null()),
        proxiedServices: z.array(z.string()).or(z.null()),
      }),
      timeout: z.number().or(z.null()),
      preferredRegex: z.array(z.string()),
      requiredRegex: z.array(z.string()),
      excludedRegex: z.array(z.string()),
    }),
    presets: z.array(PresetMetadataSchema),
  }),
});

export type StatusResponse = z.infer<typeof StatusResponseSchema>;
export type PresetMetadata = z.infer<typeof PresetMetadataSchema>;
