import { BaseFormatter, FormatterConfig } from './base';

export class TorrentioFormatter extends BaseFormatter {
  constructor() {
    super({
      name: '{stream.title} {stream.quality}',
      description: '{stream.size::bytes} {stream.seeders} seeders',
    });
  }
}

export class TorboxFormatter extends BaseFormatter {
  constructor() {
    super({
      name: '{stream.title} {stream.quality}',
      description: '{stream.size::bytes} {stream.seeders} seeders',
    });
  }
}

export class GDriveFormatter extends BaseFormatter {
  constructor() {
    super({
      name: '{stream.title} {stream.quality}',
      description: '{stream.size::bytes} {stream.seeders} seeders',
    });
  }
}

export class LightGDriveFormatter extends BaseFormatter {
  constructor() {
    super({
      name: '{stream.title} {stream.quality}',
      description: '{stream.size::bytes} {stream.seeders} seeders',
    });
  }
}

export class MinimalisticGdriveFormatter extends BaseFormatter {
  constructor() {
    super({
      name: '{stream.title} {stream.quality}',
      description: '{stream.size::bytes} {stream.seeders} seeders',
    });
  }
}
