import { Stream, ParsedStream, Addon } from '../db';
import { constants } from '../utils';
import FileParser from './file';

class StreamParser {
  constructor(private readonly addon: Addon) {}

  parse(stream: Stream): ParsedStream {
    let parsedStream: ParsedStream = {
      addon: this.addon,
      type: this.getStreamType(stream, undefined),
      parsedFile: {},
    };

    this.raiseErrorIfNecessary(stream);

    parsedStream.filename = this.getFilename(stream);
    parsedStream.folderName = this.getFolder(stream);
    parsedStream.size = this.getSize(stream);
    parsedStream.indexer = this.getIndexer(stream);
    parsedStream.service = this.getService(stream);
    parsedStream.duration = this.getDuration(stream);
    parsedStream.type = this.getStreamType(stream, parsedStream.service);

    if (parsedStream.filename) {
      parsedStream.parsedFile = FileParser.parse(parsedStream.filename);
    }

    parsedStream.torrent = {
      infoHash: stream.infoHash,
      seeders: this.getSeeders(stream),
      sources: stream.sources,
      fileIdx: stream.fileIdx,
    };

    return parsedStream;
  }

  protected raiseErrorIfNecessary(stream: Stream) {
    const errorRegex = /invalid\s+\w+\s+(account|apikey|token)/i;
    if (errorRegex.test(stream.description || stream.title || '')) {
      throw new Error('Invalid account or apikey or token');
    }
  }

  protected getFilename(stream: Stream): string | undefined {
    let filename = stream.behaviorHints?.filename;

    if (filename) {
      return this.normaliseFilename(filename);
    }

    const description = stream.description || stream.title;
    if (!description) {
      return undefined;
    }

    // attempt to find a filename by finding the most suitable line that has more info
    const potentialFilenames = description
      .split('\n')
      .filter((line) => line.trim() !== '')
      .splice(0, 5);

    for (const line of potentialFilenames) {
      const parsed = FileParser.parse(line);
      if (parsed.year || (parsed.season && parsed.episode) || parsed.episode) {
        filename = line;
        break;
      }
    }

    if (!filename) {
      filename = description.split('\n')[0];
    }

    return this.normaliseFilename(filename);
  }

  protected getFolder(stream: Stream): string | undefined {
    return undefined;
  }

  protected getSize(stream: Stream): number | undefined {
    const description = stream.description || stream.title;
    let size =
      stream.behaviorHints?.videoSize ||
      (stream as any).size ||
      (stream as any).sizeBytes ||
      (stream as any).sizebytes ||
      (description && this.calculateBytesFromSizeString(description)) ||
      (stream.name && this.calculateBytesFromSizeString(stream.name));

    if (typeof size === 'string') {
      size = parseInt(size);
    }

    return size;
  }

  protected getSeeders(stream: Stream): number | undefined {
    const regex = /[👥👤]\s*(\d+)/u;
    const match = stream.title?.match(regex);
    if (match) {
      return parseInt(match[1]);
    }

    return undefined;
  }

  protected getIndexer(stream: Stream): string | undefined {
    const regex =
      /(?:🌐|⚙️|🔗|🔎|☁️)\s?(.*?)(?=[\p{Emoji_Presentation}]|$|\n)/u;
    const match = stream.title?.match(regex);
    if (match) {
      return match[1];
    }

    return undefined;
  }

  protected getService(stream: Stream): ParsedStream['service'] | undefined {
    return this.parseServiceData(stream.name || '');
  }

  protected getDuration(stream: Stream): number | undefined {
    // Regular expression to match different formats of time durations
    const regex =
      /(?<![^\s\[(_\-,.])(?:(\d+)h[:\s]?(\d+)m[:\s]?(\d+)s|(\d+)h[:\s]?(\d+)m|(\d+)h|(\d+)m|(\d+)s)(?=[\s\)\]_.\-,]|$)/gi;

    const match = regex.exec(stream.description || stream.title || '');
    if (!match) {
      return 0;
    }

    const hours = parseInt(match[1] || match[4] || match[6] || '0', 10);
    const minutes = parseInt(match[2] || match[5] || match[7] || '0', 10);
    const seconds = parseInt(match[3] || match[8] || '0', 10);

    // Convert to milliseconds
    const totalMilliseconds = (hours * 3600 + minutes * 60 + seconds) * 1000;

    return totalMilliseconds;
  }

  protected getStreamType(
    stream: Stream,
    service: ParsedStream['service']
  ): ParsedStream['type'] {
    if (stream.infoHash) {
      return 'p2p';
    }

    if (stream.url?.endsWith('.m3u8')) {
      return 'live';
    }

    if (service?.id === constants.EASYNEWS_SERVICE) {
      return 'usenet';
    } else if (service) {
      return 'debrid';
    }

    // return 'http';
    if (stream.url) {
      return 'http';
    }

    if (stream.externalUrl) {
      return 'external';
    }

    if (stream.ytId) {
      return 'youtube';
    }

    throw new Error('Invalid stream, missing a required stream property');
  }

  private normaliseFilename(filename: string): string {
    // remove all non-alphanumeric characters, replace spaces with . and remove trailing and leading . or spaces
    return filename
      .replace(/[^a-zA-Z0-9]/g, '')
      .replace(/\s+/g, '.')
      .replace(/^\.+|\.+$/g, '');
  }

  private calculateBytesFromSizeString(size: string, k: number = 1024): number {
    const sizePattern = /(\d+(\.\d+)?)\s?(KB|MB|GB)/i;
    const match = size.match(sizePattern);
    if (!match) return 0;

    const value = parseFloat(match[1]);
    const unit = match[3];

    switch (unit.toUpperCase()) {
      case 'TB':
        return value * k * k * k * k;
      case 'GB':
        return value * k * k * k;
      case 'MB':
        return value * k * k;
      case 'KB':
        return value * k;
      default:
        return 0;
    }
  }

  protected parseServiceData(
    string: string
  ): ParsedStream['service'] | undefined {
    const cleanString = string.replace(/web-?dl/i, '');
    const services = constants.SERVICE_DETAILS;
    const cachedSymbols = ['+', '⚡', '🚀', 'cached'];
    const uncachedSymbols = ['⏳', 'download', 'UNCACHED'];
    let streamService: ParsedStream['service'] | undefined;
    Object.values(services).forEach((service) => {
      // for each service, generate a regexp which creates a regex with all known names separated by |
      const regex = new RegExp(
        `(^|(?<![^ |[(_\\/\\-.]))(${service.knownNames.join('|')})(?=[ ⬇️⏳⚡+/|\\)\\]_.-]|$|\n)`,
        'i'
      );
      // check if the string contains the regex
      if (regex.test(cleanString)) {
        let cached: boolean = false;
        // check if any of the uncachedSymbols are in the string
        if (uncachedSymbols.some((symbol) => string.includes(symbol))) {
          cached = false;
        }
        // check if any of the cachedSymbols are in the string
        else if (cachedSymbols.some((symbol) => string.includes(symbol))) {
          cached = true;
        }

        streamService = {
          id: service.id,
          cached: cached,
        };
      }
    });
    return streamService;
  }
}

export default StreamParser;
