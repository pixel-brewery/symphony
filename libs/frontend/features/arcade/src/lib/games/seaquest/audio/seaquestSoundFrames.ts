// #region Imports

import type { ISeaquestSoundEvent } from '../model/ISeaquestSoundEvent';

// #endregion

type Registers = readonly [control: number, divider: number, volume: number];

/**
 * Transcribes Seaquest's countdown and oxygen-driven AUDC/AUDF/AUDV writes.
 * Each tuple lasts one 60 Hz simulation frame; an empty channel leaves its current effect alone.
 * @param event - Model event, with the oxygen value for refill and bonus ticks.
 * @returns Register frames for the cartridge's two channels.
 * @public
 */
export function seaquestSoundFrames(
  event: ISeaquestSoundEvent,
): readonly [readonly Registers[], readonly Registers[]] {
  const channel0: Registers[] = [];
  const channel1: Registers[] = [];
  const oxygen = Math.max(0, Math.min(64, Math.round(event.oxygen ?? event.value ?? 64)));
  const kind =
    event.kind === 'enemy' ? (event.target === 'sub' ? 'enemy-sub' : 'enemy-shark') : event.kind;
  switch (kind) {
    case 'shoot':
      for (let frame = 0; frame < Math.min(64, event.durationFrames ?? 64); frame++) {
        const count = 16 - Math.floor(frame / 4);
        channel0.push([15, count, oxygen < 17 ? 0 : count >> 1]);
      }
      break;
    case 'shot-end':
      channel0.push([0, 0, 0]);
      break;
    case 'enemy-shark':
      for (let count = 16; count > 0; count--) channel1.push([12, count >> 1, (count >> 1) & 4]);
      break;
    case 'enemy-sub':
      for (let count = 32; count > 0; count--)
        channel1.push([8, (count >> 1) & 1 ? 20 : 12, (count >> 1) & 15]);
      break;
    case 'diver':
    case 'full':
      for (let count = 23; count > 0; count--)
        channel1.push([12, kind === 'full' ? 3 : 12, count >> 1]);
      break;
    case 'warning':
      for (let frame = 0; frame < 32; frame++)
        channel1.push([(((event.frame ?? 0) + frame) & 16) !== 0 ? 12 : 4, 24, 8]);
      break;
    case 'surface':
      for (let frame = 0; frame < 16; frame++) {
        // AUDV only decodes four bits, including the initial register write of 31.
        const volume = (31 >> Math.min(5, frame)) & 15;
        channel0.push([12, 12, volume]);
        channel1.push([12, 6, volume]);
      }
      break;
    case 'bonus':
      for (let frame = 0; frame < 2; frame++) {
        const divider = ~(oxygen & 15) & 31;
        channel0.push([12, divider, oxygen === 0 ? 0 : 6]);
        channel1.push([12, (divider - 5) & 31, oxygen === 0 ? 0 : 6]);
      }
      break;
    case 'refill':
      for (let frame = 0; frame < 2; frame++) {
        const divider = ~(oxygen >> 1) & 31;
        channel0.push([8, divider, 4]);
        channel1.push([8, (divider + 7) & 31, 4]);
      }
      break;
    case 'death':
      for (let count = 22; count > 0; count--)
        for (let frame = 0; frame < 4; frame++) {
          channel0.push(count >= 15 ? [15, count & 1 ? 3 : 16, 6] : [8, 16, count]);
          channel1.push([0, 0, 0]);
        }
      break;
    case 'completed':
    case 'extra-life':
      // IncrementScore awards a sub and caps the score without writing a new audio cue.
      break;
  }
  return [channel0, channel1];
}
