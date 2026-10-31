// #region Imports

import { describe, expect, it } from 'vitest';
import { seaquestSoundFrames } from './seaquestSoundFrames';

// #endregion

describe('seaquestSoundFrames', () => {
  it('changes the sixth diver pitch and preserves the original decaying volume', () => {
    // arrange
    const diver = seaquestSoundFrames({ id: 1, kind: 'diver' })[1];

    // act
    const full = seaquestSoundFrames({ id: 2, kind: 'full' })[1];

    // assert
    expect(diver).toHaveLength(23);
    expect(diver[0]).toEqual([12, 12, 11]);
    expect(full[0]).toEqual([12, 3, 11]);
    expect(full.at(-1)).toEqual([12, 3, 0]);
  });

  it('keeps shark and submarine hits distinct and respects the four-bit volume register', () => {
    // arrange
    const shark = seaquestSoundFrames({ id: 1, kind: 'enemy', target: 'shark' })[1];

    // act
    const sub = seaquestSoundFrames({ id: 2, kind: 'enemy', target: 'sub' })[1];

    // assert
    expect(shark[0]).toEqual([12, 8, 0]);
    expect(shark[8]).toEqual([12, 4, 4]);
    expect(sub[0]).toEqual([8, 12, 0]);
    expect(sub[1]).toEqual([8, 20, 15]);
    expect(sub).toHaveLength(32);
  });

  it('drives both refill channels from oxygen and silences torpedoes below warning threshold', () => {
    // arrange
    const refill = seaquestSoundFrames({ id: 1, kind: 'refill', oxygen: 32 });

    // act
    const lowOxygenShot = seaquestSoundFrames({ id: 2, kind: 'shoot', oxygen: 16 });

    // assert
    expect(refill).toEqual([
      [
        [8, 15, 4],
        [8, 15, 4],
      ],
      [
        [8, 22, 4],
        [8, 22, 4],
      ],
    ]);
    expect(lowOxygenShot[0].every((frame) => frame[2] === 0)).toBe(true);
  });

  it('alternates the warning by global frame phase and emits no invented extra-life tune', () => {
    // arrange
    const warning = seaquestSoundFrames({ id: 1, kind: 'warning', frame: 16 })[1];

    // act
    const extraLife = seaquestSoundFrames({ id: 2, kind: 'extra-life' });

    // assert
    expect(warning[0]).toEqual([12, 24, 8]);
    expect(warning[16]).toEqual([4, 24, 8]);
    expect(extraLife).toEqual([[], []]);
  });
});
