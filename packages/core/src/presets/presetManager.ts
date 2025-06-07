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
import { AIOStreamsPreset } from './aiostreams';
import { OpenSubtitlesPreset } from './opensubtitles';
import { PeerflixPreset } from './peerflix';
import { DMMCastPreset } from './dmmCast';
import { MarvelPreset } from './marvel';
import { JackettioPreset } from './jackettio';
import { OrionPreset } from './orion';
import { StreamFusionPreset } from './streamfusion';

const PRESET_LIST: string[] = [
  'torrentio',
  'comet',
  'mediafusion',
  'stremthruTorz',
  'stremthruStore',
  'torbox',
  'jackettio',
  'peerflix',
  'easynews',
  'easynewsPlus',
  'easynewsPlusPlus',
  'debridio',
  'streamfusion',
  'dmm-cast',
  'orion',
  'opensubtitles',
  'marvel-catalog',
  'aiostreams',
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
      case 'jackettio':
        return JackettioPreset;
      case 'easynews':
        return EasynewsPreset;
      case 'easynewsPlus':
        return EasynewsPlusPreset;
      case 'easynewsPlusPlus':
        return EasynewsPlusPlusPreset;
      case 'debridio':
        return DebridioPreset;
      case 'aiostreams':
        return AIOStreamsPreset;
      case 'opensubtitles':
        return OpenSubtitlesPreset;
      case 'peerflix':
        return PeerflixPreset;
      case 'dmm-cast':
        return DMMCastPreset;
      case 'marvel-catalog':
        return MarvelPreset;
      case 'orion':
        return OrionPreset;
      case 'streamfusion':
        return StreamFusionPreset;
      default:
        throw new Error(`Preset ${id} not found`);
    }
  }
}
