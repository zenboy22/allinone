import { isMatch, firstMatch } from 'super-regex';
import { Cache } from './cache';
import { getTextHash } from './crypto';
import { createLogger } from './logger';
import { Settings } from './settings';

const DEFAULT_TIMEOUT = 1000; // 1 second timeout
const regexCache = Cache.getInstance<string, RegExp>('regexCache');
const resultCache = Cache.getInstance<string, string>('regexResultCache');

const logger = createLogger('regex');

/**
 * Safely tests a regex pattern against a string with ReDoS protection
 * @param pattern The regex pattern to test
 * @param str The string to test against
 * @param timeoutMs Optional timeout in milliseconds (default: 1000ms)
 * @returns boolean indicating if the pattern matches the string
 */
export function safeRegexTest(
  pattern: string | RegExp,
  str: string,
  timeoutMs: number = DEFAULT_TIMEOUT
): boolean {
  // const compiledPattern =
  //   typeof pattern === 'string'
  //     ? regexCache.wrap(
  //         (p: string) => new RegExp(p),
  //         getTextHash(pattern),
  //         60,
  //         pattern
  //       )
  //     : pattern;
  const compiledPattern =
    typeof pattern === 'string' ? compileRegex(pattern) : pattern;
  try {
    const result = resultCache.wrap(
      (p: RegExp, s: string) => isMatch(p, s, { timeout: timeoutMs }),
      getTextHash(`${compiledPattern.toString()}|${str}`),
      60,
      compiledPattern,
      str
    );
    return result;
  } catch (error) {
    logger.error(`Regex test timed out after ${timeoutMs}ms:`, error);
    return false;
  }
}

export function compileRegex(pattern: string, flags: string = ''): RegExp {
  const compiledPattern = regexCache.wrap(
    (p: string, f: string) => new RegExp(p, f),
    getTextHash(`${pattern}|${flags}`),
    60,
    pattern,
    flags
  );
  return compiledPattern;
}

export function formRegexFromKeywords(
  keywords: string[],
  flags: string = 'i'
): RegExp {
  const pattern = `(?<![^ [(_\\-.])(${keywords
    .map((filter) => filter.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&'))
    .map((filter) => filter.replace(/\s/g, '[ .\\-_]?'))
    .join('|')})(?=[ \\)\\]_.-]|$)`;

  return compileRegex(pattern, flags);
}
