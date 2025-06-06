import { Parser } from 'expr-eval';
import { ParsedStream } from '../db';

export class ConditionParser {
  private parser: Parser;
  private previousStreams: ParsedStream[];
  private totalStreams: ParsedStream[];
  private previousGroupTimeTaken: number;
  private totalTimeTaken: number;

  constructor(
    previousStreams: ParsedStream[],
    totalStreams: ParsedStream[],
    previousGroupTimeTaken: number,
    totalTimeTaken: number
  ) {
    this.previousStreams = previousStreams;
    this.totalStreams = totalStreams;
    this.previousGroupTimeTaken = previousGroupTimeTaken;
    this.totalTimeTaken = totalTimeTaken;

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

    this.parser.consts.previousStreams = this.previousStreams;
    this.parser.consts.totalStreams = this.totalStreams;
    this.parser.consts.previousGroupTimeTaken = this.previousGroupTimeTaken;
    this.parser.consts.totalTimeTaken = this.totalTimeTaken;
    this.parser.functions.indexerPresent = function (
      streams: ParsedStream[],
      indexer: string
    ) {
      return streams.some((stream) => stream.indexer === indexer);
    };
    this.parser.functions.groupByRegexMatched = function (
      streams: ParsedStream[]
    ) {
      return streams.filter((stream) => stream.regexMatched).length;
    };
    this.parser.functions.groupBySpecificRegexMatched = function (
      streams: ParsedStream[],
      regexName: string
    ) {
      return streams.filter((stream) => stream.regexMatched?.name === regexName)
        .length;
    };
    this.parser.functions.groupByIndexer = function (
      streams: ParsedStream[],
      indexer: string
    ) {
      if (!Array.isArray(streams)) {
        throw new Error(
          "Please use one of 'totalStreams' or 'previousStreams' as the first argument"
        );
      } else if (typeof indexer !== 'string') {
        throw new Error('Indexer must be a string');
      }
      return streams.filter((stream) => stream.indexer === indexer).length;
    };
    this.parser.functions.groupByResolution = function (
      streams: ParsedStream[],
      resolution: string
    ) {
      if (!Array.isArray(streams)) {
        throw new Error(
          "Please use one of 'totalStreams' or 'previousStreams' as the first argument"
        );
      } else if (typeof resolution !== 'string') {
        throw new Error('Resolution must be a string');
      }
      return streams.filter(
        (stream) => stream.parsedFile?.resolution === resolution
      ).length;
    };
    this.parser.functions.groupByQuality = function (
      streams: ParsedStream[],
      quality: string
    ) {
      if (!Array.isArray(streams)) {
        throw new Error(
          "Please use one of 'totalStreams' or 'previousStreams' as the first argument"
        );
      } else if (typeof quality !== 'string') {
        throw new Error('Quality must be a string');
      }
      return streams.filter((stream) => stream.parsedFile?.quality === quality)
        .length;
    };
    this.parser.functions.groupByType = function (
      streams: ParsedStream[],
      type: string
    ) {
      if (!Array.isArray(streams)) {
        throw new Error(
          "Please use one of 'totalStreams' or 'previousStreams' as the first argument"
        );
      } else if (typeof type !== 'string') {
        throw new Error('Type must be a string');
      }
      return streams.filter((stream) => stream.type === type).length;
    };
    this.parser.functions.groupByService = function (
      streams: ParsedStream[],
      service: string
    ) {
      if (!Array.isArray(streams)) {
        throw new Error(
          "Please use one of 'totalStreams' or 'previousStreams' as the first argument"
        );
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
      return streams.filter((stream) => stream.service?.id === service).length;
    };
    this.parser.functions.groupByCached = function (
      streams: ParsedStream[],
      cached: boolean
    ) {
      if (!Array.isArray(streams)) {
        throw new Error(
          "Please use one of 'totalStreams' or 'previousStreams' as the first argument"
        );
      } else if (typeof cached !== 'boolean') {
        throw new Error('Cached must be a boolean');
      }
      return streams.filter((stream) => stream.service?.cached === cached)
        .length;
    };
    this.parser.functions.groupByReleaseGroup = function (
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
      ).length;
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
  async parse(condition: string) {
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

  static async testParse(condition: string) {
    const parser = new ConditionParser([], [], 0, 0);
    return await parser.parse(condition);
  }
}
