import { Parser } from 'expr-eval';
import { ParsedStream, ParsedStreams, ParsedStreamSchema } from '../db';
import bytes from 'bytes';

export abstract class BaseConditionParser {
  protected parser: Parser;

  constructor() {
    // only allow comparison and logical operators
    this.parser = new Parser({
      operators: {
        comparison: true,
        logical: true,
        add: false,
        concatenate: false,
        conditional: false,
        divide: false,
        factorial: false,
        multiply: false,
        power: false,
        remainder: false,
        subtract: false,
        sin: false,
        cos: false,
        tan: false,
        asin: false,
        acos: false,
        atan: false,
        sinh: false,
        cosh: false,
        tanh: false,
        asinh: false,
        acosh: false,
        atanh: false,
        sqrt: false,
        log: false,
        ln: false,
        lg: false,
        log10: false,
        abs: false,
        ceil: false,
        floor: false,
        round: false,
        trunc: false,
        exp: false,
        length: false,
        in: false,
        random: false,
        min: false,
        max: false,
        assignment: false,
        fndef: false,
        cbrt: false,
        expm1: false,
        log1p: false,
        sign: false,
        log2: false,
      },
    });

    this.setupParserFunctions();
  }

  private setupParserFunctions() {
    this.parser.functions.regexMatched = function (
      streams: ParsedStream[],
      regexName?: string
    ) {
      return streams.filter((stream) =>
        regexName
          ? stream.regexMatched?.name === regexName
          : stream.regexMatched
      );
    };

    this.parser.functions.indexer = function (
      streams: ParsedStream[],
      indexer: string
    ) {
      if (!Array.isArray(streams) || streams.some((stream) => !stream.type)) {
        throw new Error('Your streams input must be an array of streams');
      } else if (typeof indexer !== 'string') {
        throw new Error('Indexer must be a string');
      }
      return streams.filter((stream) => stream.indexer === indexer);
    };

    this.parser.functions.resolution = function (
      streams: ParsedStream[],
      resolution: string
    ) {
      if (!Array.isArray(streams) || streams.some((stream) => !stream.type)) {
        throw new Error('Your streams input must be an array of streams');
      } else if (typeof resolution !== 'string') {
        throw new Error('Resolution must be a string');
      }
      return streams.filter(
        (stream) => (stream.parsedFile?.resolution || 'Unknown') === resolution
      );
    };

    this.parser.functions.quality = function (
      streams: ParsedStream[],
      quality: string
    ) {
      if (!Array.isArray(streams) || streams.some((stream) => !stream.type)) {
        throw new Error('Your streams input must be an array of streams');
      } else if (typeof quality !== 'string') {
        throw new Error('Quality must be a string');
      }
      return streams.filter(
        (stream) => (stream.parsedFile?.quality || 'Unknown') === quality
      );
    };

    this.parser.functions.encode = function (
      streams: ParsedStream[],
      encode: string
    ) {
      if (!Array.isArray(streams) || streams.some((stream) => !stream.type)) {
        throw new Error('Your streams input must be an array of streams');
      } else if (typeof encode !== 'string') {
        throw new Error('Encode must be a string');
      }
      return streams.filter((stream) => stream.parsedFile?.encode === encode);
    };

    this.parser.functions.type = function (
      streams: ParsedStream[],
      type: string
    ) {
      if (!Array.isArray(streams)) {
        throw new Error('Your streams input must be an array of streams');
      } else if (typeof type !== 'string') {
        throw new Error('Type must be a string');
      }
      return streams.filter((stream) => stream.type === type);
    };

    this.parser.functions.visualTag = function (
      streams: ParsedStream[],
      visualTag: string
    ) {
      if (!Array.isArray(streams) || streams.some((stream) => !stream.type)) {
        throw new Error('Your streams input must be an array of streams');
      } else if (typeof visualTag !== 'string') {
        throw new Error('Visual type must be a string');
      }
      return streams.filter((stream) =>
        stream.parsedFile?.visualTags.includes(visualTag)
      );
    };

    this.parser.functions.audioTag = function (
      streams: ParsedStream[],
      audioTag: string
    ) {
      if (!Array.isArray(streams) || streams.some((stream) => !stream.type)) {
        throw new Error('Your streams input must be an array of streams');
      } else if (typeof audioTag !== 'string') {
        throw new Error('Audio tag must be a string');
      }
      return streams.filter((stream) =>
        stream.parsedFile?.audioTags.includes(audioTag)
      );
    };

    this.parser.functions.audioChannels = function (
      streams: ParsedStream[],
      audioChannels: string
    ) {
      if (!Array.isArray(streams) || streams.some((stream) => !stream.type)) {
        throw new Error('Your streams input must be an array of streams');
      } else if (typeof audioChannels !== 'string') {
        throw new Error('Audio channels must be a string');
      }
      return streams.filter((stream) =>
        stream.parsedFile?.audioChannels?.includes(audioChannels)
      );
    };

    this.parser.functions.language = function (
      streams: ParsedStream[],
      language: string
    ) {
      if (!Array.isArray(streams) || streams.some((stream) => !stream.type)) {
        throw new Error('Your streams input must be an array of streams');
      } else if (typeof language !== 'string') {
        throw new Error('Language must be a string');
      }
      return streams.filter((stream) =>
        stream.parsedFile?.languages?.includes(language)
      );
    };

    this.parser.functions.seeders = function (
      streams: ParsedStream[],
      minSeeders?: number,
      maxSeeders?: number
    ) {
      if (!Array.isArray(streams) || streams.some((stream) => !stream.type)) {
        throw new Error('Your streams input must be an array of streams');
      } else if (
        typeof minSeeders !== 'number' &&
        typeof maxSeeders !== 'number'
      ) {
        throw new Error('Min and max seeders must be a number');
      }
      // select streams with seeders that lie within the range.
      return streams.filter((stream) => {
        if (minSeeders && (stream.torrent?.seeders ?? 0) < minSeeders) {
          return false;
        }
        if (maxSeeders && (stream.torrent?.seeders ?? 0) > maxSeeders) {
          return false;
        }
        return true;
      });
    };

    this.parser.functions.size = function (
      streams: ParsedStream[],
      minSize?: string | number,
      maxSize?: string | number
    ) {
      if (!Array.isArray(streams) || streams.some((stream) => !stream.type)) {
        throw new Error('Your streams input must be an array of streams');
      } else if (
        typeof minSize !== 'number' &&
        typeof maxSize !== 'number' &&
        typeof minSize !== 'string' &&
        typeof maxSize !== 'string'
      ) {
        throw new Error('Min and max size must be a number');
      }
      // use the bytes library to ensure we get a number
      const minSizeInBytes =
        typeof minSize === 'string' ? bytes.parse(minSize) : minSize;
      const maxSizeInBytes =
        typeof maxSize === 'string' ? bytes.parse(maxSize) : maxSize;
      return streams.filter((stream) => {
        if (
          minSize &&
          stream.size &&
          minSizeInBytes &&
          stream.size < minSizeInBytes
        ) {
          return false;
        }
        if (
          maxSize &&
          stream.size &&
          maxSizeInBytes &&
          stream.size > maxSizeInBytes
        ) {
          return false;
        }
        return true;
      });
    };

    this.parser.functions.service = function (
      streams: ParsedStream[],
      service: string
    ) {
      if (!Array.isArray(streams) || streams.some((stream) => !stream.type)) {
        throw new Error('Your streams input must be an array of streams');
      } else if (
        typeof service !== 'string' ||
        ![
          'realdebrid',
          'debridlink',
          'alldebrid',
          'torbox',
          'pikpak',
          'seedr',
          'offcloud',
          'premiumize',
          'easynews',
          'easydebrid',
        ].includes(service)
      ) {
        throw new Error(
          'Service must be a string and one of: realdebrid, debridlink, alldebrid, torbox, pikpak, seedr, offcloud, premiumize, easynews, easydebrid'
        );
      }
      return streams.filter((stream) => stream.service?.id === service);
    };

    this.parser.functions.cached = function (streams: ParsedStream[]) {
      if (!Array.isArray(streams)) {
        throw new Error(
          "Please use one of 'totalStreams' or 'previousStreams' as the first argument"
        );
      }
      return streams.filter((stream) => stream.service?.cached === true);
    };

    this.parser.functions.uncached = function (streams: ParsedStream[]) {
      if (!Array.isArray(streams)) {
        throw new Error(
          "Please use one of 'totalStreams' or 'previousStreams' as the first argument"
        );
      }
      return streams.filter((stream) => stream.service?.cached === false);
    };

    this.parser.functions.releaseGroup = function (
      streams: ParsedStream[],
      releaseGroup: string
    ) {
      if (!Array.isArray(streams)) {
        throw new Error(
          "Please use one of 'totalStreams' or 'previousStreams' as the first argument"
        );
      } else if (typeof releaseGroup !== 'string') {
        throw new Error('Release group must be a string');
      }
      return streams.filter(
        (stream) => stream.parsedFile?.releaseGroup === releaseGroup
      );
    };

    this.parser.functions.addon = function (
      streams: ParsedStream[],
      addon: string
    ) {
      if (!Array.isArray(streams) || streams.some((stream) => !stream.type)) {
        throw new Error('Your streams input must be an array of streams');
      } else if (typeof addon !== 'string') {
        throw new Error('Addon must be a string');
      }
      return streams.filter((stream) => stream.addon.name === addon);
    };

    this.parser.functions.library = function (streams: ParsedStream[]) {
      if (!Array.isArray(streams) || streams.some((stream) => !stream.type)) {
        throw new Error('Your streams input must be an array of streams');
      }
      return streams.filter((stream) => stream.library);
    };

    this.parser.functions.count = function (streams: ParsedStream[]) {
      if (!Array.isArray(streams)) {
        throw new Error(
          "Please use one of 'totalStreams' or 'previousStreams' as the first argument"
        );
      }
      return streams.length;
    };
  }

  protected async evaluateCondition(condition: string): Promise<any> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Condition parsing timed out'));
      }, 1);

      try {
        const result = this.parser.evaluate(condition);
        clearTimeout(timeout);
        resolve(result);
      } catch (error) {
        clearTimeout(timeout);
        reject(error);
      }
    });
  }
}

export class GroupConditionParser extends BaseConditionParser {
  private previousStreams: ParsedStream[];
  private totalStreams: ParsedStream[];
  private previousGroupTimeTaken: number;
  private totalTimeTaken: number;

  constructor(
    previousStreams: ParsedStream[],
    totalStreams: ParsedStream[],
    previousGroupTimeTaken: number,
    totalTimeTaken: number,
    queryType: string
  ) {
    super();

    this.previousStreams = previousStreams;
    this.totalStreams = totalStreams;
    this.previousGroupTimeTaken = previousGroupTimeTaken;
    this.totalTimeTaken = totalTimeTaken;

    // Set up constants for this specific parser
    this.parser.consts.previousStreams = this.previousStreams;
    this.parser.consts.totalStreams = this.totalStreams;
    this.parser.consts.queryType = queryType;
    this.parser.consts.previousGroupTimeTaken = this.previousGroupTimeTaken;
    this.parser.consts.totalTimeTaken = this.totalTimeTaken;
  }

  async parse(condition: string) {
    return await this.evaluateCondition(condition);
  }

  static async testParse(condition: string) {
    const parser = new GroupConditionParser([], [], 0, 0, 'movie');
    return await parser.parse(condition);
  }
}

export class SelectConditionParser extends BaseConditionParser {
  constructor() {
    super();
  }

  async select(
    streams: ParsedStream[],
    condition: string
  ): Promise<ParsedStream[]> {
    // Set the streams constant for this filter operation
    this.parser.consts.streams = streams;
    let selectedStreams: ParsedStream[] = [];

    try {
      selectedStreams = await this.evaluateCondition(condition);
    } catch (error) {
      throw new Error(
        `Filter condition failed: ${error instanceof Error ? error.message : String(error)}`
      );
    }

    // attempt to parse the result
    try {
      selectedStreams = ParsedStreams.parse(selectedStreams);
    } catch (error) {
      throw new Error(
        `Filter condition failed: ${error instanceof Error ? error.message : String(error)}`
      );
    }
    return selectedStreams;
    // // If the result is an array of streams, return those that should be filtered out
    // // use ParsedResultSchema to validate
    // if (selectedStreams.length > 0) {
    //   // Filter out the selected streams from the input array
    //   return streams.filter((stream) => !selectedStreams.includes(stream));
    // }

    // // If the result is not a stream array, return the original streams
    // return streams;
  }

  static async testSelect(
    streams: ParsedStream[],
    condition: string
  ): Promise<ParsedStream[]> {
    const parser = new SelectConditionParser();
    return await parser.select(streams, condition);
  }
}
