import { BaseFormatter, FormatterConfig } from './base';

export class TorrentioFormatter extends BaseFormatter {
  constructor() {
    super({
      name: `
{stream.proxied::istrue["🕵️‍♂️ "||""]}{stream.type::=p2p["[P2P] "||""]}{service.id::exists["[{service.shortName}"||""]}{service.cached::istrue["+] "||""]}{service.cached::isfalse[" download] "||""]}{addon.name} {stream.resolution::exists["{stream.resolution}"||"Unknown"]}
{stream.visualTags::exists["{stream.visualTags::join(' | ')}"||""]}      
`,
      description: `
{stream.message::exists["ℹ️{stream.message}"||""]}
{stream.folderName::exists["{stream.folderName}"||""]}
{stream.filename::exists["{stream.filename}"||""]}
{stream.size::>0["💾{stream.size::bytes2} "||""]}{stream.seeders::>=0["👤{stream.seeders} "||""]}{stream.age::exists["📅{stream.age} "||""]}{stream.indexer::exists["⚙️{stream.indexer}"||""]}
{stream.languageEmojis::exists["{stream.languageEmojis::join( / ')}"||""]}
`,
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
