import {
  Option,
  Resource,
  Stream,
  ParsedStream,
  UserData,
  PresetMetadata,
} from '../db';
import { StreamParser } from '../parser';
/**
 *
 * What modifications are needed for each preset:
 *
 * comet: apply FORCE_COMET_HOSTNAME, FORCE_COMET_PORT, FORCE_COMET_PROTOCOl to stream urls if they are defined
 * dmm cast:  need to split title by newline, replace trailing dashes, excluding lines with box emoji, and
 *           then joining the array back together.
 * easynews,easynews+,easynews++: need to set type as usenet
 * jackettio: apply FORCE_JACKETTIO_HOSTNAME, FORCE_JACKETTIO_PORT, FORCE_JACKETTIO_PROTOCOL to stream urls if they are defined
 * mediafusion: need to add hint for folder name, 📁 emoji, and split on arrow, take last index.
 * stremio-jacektt: need to inspect stream urls to extract service info.
 * stremthruStore: need to mark each stream as 'inLibrary' and unset any parsed 'indexer'
 * torbox: need to use different regex for probably everything.
 * torrentio: extract folder name from first line
 */

export abstract class Preset {
  static get METADATA(): PresetMetadata {
    throw new Error('METADATA must be implemented by derived classes');
  }

  static getParser(): typeof StreamParser {
    return StreamParser;
  }

  /**
   * Creates a preset from a preset id.
   * @param presetId - The id of the preset to create.
   * @returns The preset.
   */

  static generateAddons(
    userData: UserData,
    options?: Record<string, any>,
    baseUrl?: string,
    name?: string,
    timeout?: number,
    resources?: Resource[]
  ) {
    throw new Error('generateAddons must be implemented by derived classes');
  }

  // Utility functions for generating config strings
  /**
   * Encodes a JSON object into a base64 encoded string.
   * @param json - The JSON object to encode.
   * @returns The base64 encoded string.
   */
  protected static base64EncodeJSON(
    json: any,
    urlEncode: boolean = false, // url encode the string
    makeUrlSafe: boolean = false // replace + with -, / with _ and = with nothing
  ) {
    let encoded = Buffer.from(JSON.stringify(json)).toString('base64');
    if (makeUrlSafe) {
      encoded = encoded
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');
    } else if (urlEncode) {
      encoded = encodeURIComponent(encoded);
    }
    return encoded;
  }

  protected static urlEncodeJSON(json: any) {
    return encodeURIComponent(JSON.stringify(json));
  }

  /**
   * Transforms key-value pairs into a url encoded string
   * @param options - The key-value pair object to encode.
   * @returns The encoded string.
   */
  protected static urlEncodeKeyValuePairs(
    options: Record<string, string> | string[][]
  ) {
    return encodeURIComponent(
      (Array.isArray(options) ? options : Object.entries(options))
        .map(([key, value]) => `${key}=${value}`)
        .join('|')
    );
  }
}
