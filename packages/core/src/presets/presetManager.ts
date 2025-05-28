import { PresetMetadata } from '../db';
import { CustomPreset } from './custom';
import { Preset } from './preset';
import { StremthruStorePreset } from './stremthruStore';
import { TorrentioPreset } from './torrentio';

const PRESET_LIST: string[] = ['torrentio', 'stremthruStore', 'custom'];

export class PresetManager {
  static getPresetList(): PresetMetadata[] {
    return PRESET_LIST.map((presetId) => this.fromId(presetId).METADATA);
  }

  static fromId(id: string) {
    switch (id) {
      case 'torrentio':
        return TorrentioPreset;
      case 'stremthruStore':
        return StremthruStorePreset;
      case 'custom':
        return CustomPreset;
      default:
        throw new Error(`Preset ${id} not found`);
    }
  }
}
