import { PresetMetadata } from '../db';
import { Preset } from './preset';
import { StremthruStorePreset } from './stremthruStore';
import { TorrentioPreset } from './torrentio';

const PRESET_LIST: string[] = ['torrentio', 'stremthruStore'];

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
      default:
        throw new Error(`Preset ${id} not found`);
    }
  }
}
