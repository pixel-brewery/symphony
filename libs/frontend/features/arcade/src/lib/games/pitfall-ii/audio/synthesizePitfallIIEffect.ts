// #region Imports

import type { IPitfallIISoundEvent } from '../model/IPitfallIISoundEvent';
import { synthesizePitfallIITia } from './synthesizePitfallIITia';

// #endregion

/** Reconstructs the cartridge's countdown-driven TIA effects, without substituting pitch sweeps. @public */
export function synthesizePitfallIIEffect(
  kind: IPitfallIISoundEvent['kind'],
  sampleRate: number,
): Float32Array<ArrayBuffer> {
  const length =
    kind === 'treasure' || kind === 'checkpoint'
      ? 31
      : kind === 'fall'
        ? 16
        : kind === 'jump' || kind === 'pop'
          ? 15
          : 0;
  const frames: [number, number, number][] = [];
  for (let frame = 0; frame < length; frame++) {
    // The driver copies E6 before decrementing it (F79E), including fall's silent 0x50 frame.
    const count = length - frame;
    const divider = kind === 'jump' ? [2, 3, 4, 6][(count & 15) >> 2]! : kind === 'fall' ? 15 : 8;
    const volume =
      kind === 'jump' ? 8 : kind === 'checkpoint' || kind === 'treasure' ? count >> 1 : count & 15;
    const control =
      kind === 'jump'
        ? 1
        : kind === 'fall'
          ? 15
          : kind === 'checkpoint'
            ? 4
            : kind === 'treasure'
              ? 12
              : 8;
    frames.push([control, divider, volume]);
  }
  return synthesizePitfallIITia(frames, sampleRate);
}
