import { PresetMetadata } from '../db';
import { CometPreset } from './comet';
import { CustomPreset } from './custom';
import { MediaFusionPreset } from './mediafusion';
import { StremthruStorePreset } from './stremthruStore';
import { TorrentioPreset } from './torrentio';
import { TorboxAddonPreset } from './torbox';
import { EasynewsPreset } from './easynews';
import { EasynewsPlusPreset } from './easynewsPlus';
import { EasynewsPlusPlusPreset } from './easynewsPlusPlus';
import { StremthruTorzPreset } from './stremthruTorz';
import { DebridioPreset } from './debridio';

const PRESET_LIST: string[] = [
  'torrentio',
  'comet',
  'mediafusion',
  'stremthruTorz',
  'stremthruStore',
  'torbox',
  'easynews',
  'easynewsPlus',
  'easynewsPlusPlus',
  'debridio',
  'custom',
];

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
      case 'stremthruTorz':
        return StremthruTorzPreset;
      case 'comet':
        return CometPreset;
      case 'mediafusion':
        return MediaFusionPreset;
      case 'custom':
        return CustomPreset;
      case 'torbox':
        return TorboxAddonPreset;
      case 'easynews':
        return EasynewsPreset;
      case 'easynewsPlus':
        return EasynewsPlusPreset;
      case 'easynewsPlusPlus':
        return EasynewsPlusPlusPreset;
      case 'debridio':
        return DebridioPreset;
      default:
        throw new Error(`Preset ${id} not found`);
    }
  }
}
