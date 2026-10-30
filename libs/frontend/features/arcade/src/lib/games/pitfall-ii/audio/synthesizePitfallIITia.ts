// #region Imports

import { ArcadeTiaAudioChannel } from '../../shared/audio/ArcadeTiaAudioChannel';

// #endregion

/** Samples the TIA register modes used by Pitfall II, retaining divider and polynomial phase between frames. @public */
export function synthesizePitfallIITia(
  frames: readonly (readonly [control: number, frequency: number, volume: number])[],
  sampleRate: number,
): Float32Array<ArrayBuffer> {
  return new ArcadeTiaAudioChannel(sampleRate).sample(frames);
}
