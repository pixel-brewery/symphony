// #region Imports

import { PitfallIIMusic } from './PitfallIIMusic';
import { synthesizePitfallIITia } from './synthesizePitfallIITia';

// #endregion

const DPC_CLOCK = 20_000;
const DURATIONS = [
  [6, 12, 18, 24, 36, 48, 72, 96],
  [7, 14, 21, 28, 42, 56, 84, 112],
] as const;
const WEIGHTS = [4, 5, 6] as const;

/** Returns separate DPC and TIA stems so effects can replace percussion while the three melodies continue. @public */
export function synthesizePitfallIIMusic(
  mode: 0 | 1 | 2 | 3,
  sampleRate: number,
): readonly [Float32Array<ArrayBuffer>, Float32Array<ArrayBuffer>] {
  if (!Number.isFinite(sampleRate) || sampleRate < 8000 || sampleRate > 192000)
    throw new RangeError('Pitfall II audio requires a sample rate between 8 and 192 kHz.');
  const score = PitfallIIMusic.modes[mode];
  const samples = new Float32Array(Math.ceil((score.frames * sampleRate) / 60));
  const durations = DURATIONS[mode === 0 ? 0 : 1];
  for (let voice = 0; voice < 3; voice++) {
    let startFrame = 0;
    for (const [flags, divider] of score.voices[voice]!) {
      const duration = durations[flags & 7]!;
      const endFrame = startFrame + duration;
      if ((flags & 16) === 0) {
        const audibleEnd = endFrame - ((flags & 8) === 0 ? 1 : 0);
        const start = Math.ceil((startFrame * sampleRate) / 60);
        const end = Math.min(samples.length, Math.ceil((audibleEnd * sampleRate) / 60));
        const period = divider + 1;
        const duty = (divider - Math.floor(divider / 2)) / period;
        for (let sample = start; sample < end; sample++) {
          const phase = (((sample - start) * DPC_CLOCK) / sampleRate) % period;
          const pulse = phase < period * duty ? 1 - duty : -duty;
          samples[sample] = samples[sample]! + (pulse * WEIGHTS[voice]!) / 30;
        }
      }
      startFrame = endFrame;
    }
  }
  const drums = PitfallIIMusic.drums;
  const tickFrames = drums.tickFrames[mode];
  const offset = drums.modeOffsets[mode];
  let drumIndex = 15;
  const frames: [number, number, number][] = [];
  for (let frame = 0; frame < score.frames; frame++) {
    if (frame > 0 && frame % tickFrames === 0) drumIndex = (drumIndex + 15) % 16;
    if (drums.controlAndVolume[offset + drumIndex] === 255) drumIndex = 15;
    const packed = drums.controlAndVolume[offset + drumIndex]!;
    const control = packed >> 4;
    const frequency = drums.frequency[offset + drumIndex]!;
    const tickAge = frame % tickFrames;
    const initialVolume = packed & 15;
    const volume =
      tickAge === 0
        ? initialVolume
        : (initialVolume & 7) === 0
          ? 0
          : Math.max(0, initialVolume - tickAge);
    frames.push([control, frequency, volume]);
  }
  return [samples, synthesizePitfallIITia(frames, sampleRate)];
}
