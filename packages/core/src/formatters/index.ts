export * from './base';
export * from './predefined';
export * from './custom';
export * from './utils';

import { BaseFormatter, FormatterConfig } from './base';
import {
  TorrentioFormatter,
  TorboxFormatter,
  GDriveFormatter,
  LightGDriveFormatter,
  MinimalisticGdriveFormatter,
} from './predefined';
import { CustomFormatter } from './custom';
import { FormatterType } from '../utils/constants';

export function createFormatter(
  type: FormatterType,
  config?: FormatterConfig
): BaseFormatter {
  switch (type) {
    case 'torrentio':
      return new TorrentioFormatter();
    case 'torbox':
      return new TorboxFormatter();
    case 'gdrive':
      return new GDriveFormatter();
    case 'lightgdrive':
      return new LightGDriveFormatter();
    case 'minimalisticgdrive':
      return new MinimalisticGdriveFormatter();
    case 'custom':
      if (!config) {
        throw new Error('Config is required for custom formatter');
      }
      return CustomFormatter.fromConfig(config);
    default:
      throw new Error(`Unknown formatter type: ${type}`);
  }
}
