import { PARSE_REGEX } from './regex';
import * as PTT from 'parse-torrent-title';
import { ParsedFile } from '../db';

function matchPattern(
  filename: string,
  patterns: Record<string, RegExp>
): string | undefined {
  return Object.entries(patterns).find(([_, pattern]) =>
    pattern.test(filename)
  )?.[0];
}

function matchMultiplePatterns(
  filename: string,
  patterns: Record<string, RegExp>
): string[] {
  return Object.entries(patterns)
    .filter(([_, pattern]) => pattern.test(filename))
    .map(([tag]) => tag);
}

class FileParser {
  static parse(filename: string): ParsedFile {
    const resolution = matchPattern(filename, PARSE_REGEX.resolutions);
    const quality = matchPattern(filename, PARSE_REGEX.qualities);
    const encode = matchPattern(filename, PARSE_REGEX.encodes);
    const visualTags = matchMultiplePatterns(filename, PARSE_REGEX.visualTags);
    const audioTags = matchMultiplePatterns(filename, PARSE_REGEX.audioTags);
    const languages = matchMultiplePatterns(filename, PARSE_REGEX.languages);

    const parsed = PTT.parse(filename);
    const releaseGroup = parsed.group;
    const title = parsed.title;
    const year = parsed.year ? parsed.year.toString() : undefined;
    const season = parsed.season;
    const seasons = parsed.seasons;
    const episode = parsed.episode;

    return {
      resolution,
      quality,
      languages,
      encode,
      audioTags,
      visualTags,
      releaseGroup,
      title,
      year,
      season,
      seasons,
      episode,
    };
  }
}

export default FileParser;
