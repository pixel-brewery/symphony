// #region Imports

import type { IJungleHuntSoundEvent } from '../model/IJungleHuntSoundEvent';

// #endregion

/** Produces band-limited-duration TIA-style pulse/noise phrases without a cartridge or emulator. @public */
export function synthesizeJungleHuntSound(
  kind: IJungleHuntSoundEvent['kind'],
  sampleRate: number,
): Float32Array {
  const phrases: Record<IJungleHuntSoundEvent['kind'], readonly number[]> = {
    start: [24, 19, 16, 19, 12, 16, 12, 9],
    jump: [20, 17, 14, 12],
    vine: [11, 8],
    knife: [6, 9],
    crocodile: [10, 16, 23],
    boulder: [17, 11],
    guard: [15, 10, 7],
    death: [7, 11, 16, 22, 29],
    air: [10, 10, 10],
    section: [19, 15, 12, 9],
    rescue: [19, 15, 12, 15, 9, 9, 12, 7, 9, 12, 15, 19],
    extraLife: [15, 11, 7, 11, 7],
    gameOver: [12, 15, 19, 23, 29],
  };
  const notes = phrases[kind];
  const musical =
    kind === 'start' ||
    kind === 'rescue' ||
    kind === 'gameOver' ||
    kind === 'extraLife' ||
    kind === 'section';
  const noteLength = musical ? 0.115 : kind === 'air' ? 0.1 : 0.037;
  const rate = Number.isFinite(sampleRate) && sampleRate > 0 ? sampleRate : 44100;
  const output = new Float32Array(Math.ceil(notes.length * noteLength * rate));
  let phase = 0;
  let shift = 0x1ff;
  for (let index = 0; index < output.length; index++) {
    const time = index / rate;
    const note = Math.min(notes.length - 1, Math.floor(time / noteLength));
    const divisor = notes[note] ?? 19;
    phase += 31440 / ((divisor + 1) * (musical ? 8 : 16) * rate);
    const previous = phase - 31440 / ((divisor + 1) * (musical ? 8 : 16) * rate);
    if (Math.floor(phase) !== Math.floor(previous))
      shift = (shift >> 1) | (((shift ^ (shift >> 4)) & 1) << 8);
    const noisy = kind === 'knife' || kind === 'crocodile' || kind === 'death';
    const wave = noisy ? (shift & 1 ? 1 : -1) : phase % 1 < 0.5 ? 1 : -1;
    const withinNote = time % noteLength;
    const envelope =
      Math.min(1, withinNote / 0.003) * Math.min(1, (noteLength - withinNote) / 0.014);
    output[index] = wave * envelope * (noisy ? 0.18 : 0.14);
  }
  return output;
}
