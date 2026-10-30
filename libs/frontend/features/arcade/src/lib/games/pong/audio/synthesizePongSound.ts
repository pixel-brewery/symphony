// #region Imports

import type { IPongSoundEvent } from '../model/IPongSoundEvent';
import { PongRules } from '../model/PongRules';

// #endregion

/** Reconstructs the three original counter-derived sound gates, including vertical blanking and score-counter reset. @public */
export function synthesizePongSound(
  event: IPongSoundEvent,
  sampleRate: number,
): Float32Array<ArrayBuffer> {
  if (!Number.isFinite(sampleRate) || sampleRate < 8000 || sampleRate > 192000)
    throw new RangeError('Pong audio requires a sample rate between 8 and 192 kHz.');
  const lineRate = PongRules.clock / PongRules.lineClocks;
  // The ideal 555 score gate is 1.1 × 220 kΩ × 1 µF = 242 ms.
  const maximum = event.kind === 'score' ? 0.242 : PongRules.frameLines / lineRate;
  const samples = new Float32Array(Math.ceil(maximum * sampleRate));
  let line = event.line;
  let counter = event.ballCounter;
  let clock = 0;
  for (let sample = 0; sample < samples.length; sample++) {
    const target = Math.floor((sample * lineRate) / sampleRate);
    while (clock < target) {
      clock++;
      line = (line + 1) % PongRules.frameLines;
      if (line >= 16) {
        counter = counter === 255 ? event.verticalLoad : counter + 1;
        if (event.kind === 'paddle' && counter === 240) return samples.slice(0, sample);
      }
    }
    const bit = event.kind === 'score' ? line & 32 : counter & (event.kind === 'paddle' ? 16 : 32);
    samples[sample] = bit ? 0.18 : -0.18;
  }
  return samples;
}
