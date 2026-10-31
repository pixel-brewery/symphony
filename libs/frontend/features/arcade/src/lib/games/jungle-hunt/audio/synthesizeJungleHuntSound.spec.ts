// #region Imports

import { describe, expect, it } from 'vitest';
import { synthesizeJungleHuntSound } from './synthesizeJungleHuntSound';

// #endregion

describe('synthesizeJungleHuntSound', () => {
  it('produces finite audible bounded samples for musical and noise effects', () => {
    // arrange
    const kinds = [
      'start',
      'jump',
      'vine',
      'knife',
      'crocodile',
      'boulder',
      'guard',
      'death',
      'air',
      'section',
      'rescue',
      'extraLife',
      'gameOver',
    ] as const;
    // act
    const effects = kinds.map((kind) => synthesizeJungleHuntSound(kind, 44100));
    // assert
    for (const effect of effects) {
      expect(effect.length).toBeGreaterThan(1000);
      expect(effect.some((value) => Math.abs(value) > 0.1)).toBe(true);
      expect(effect.every((value) => Number.isFinite(value) && Math.abs(value) <= 0.2)).toBe(true);
    }
    expect(effects[10]!.length).toBeGreaterThan(effects[3]!.length);
  });

  it('uses deterministic tones and safe sample rate fallback', () => {
    // arrange
    const first = synthesizeJungleHuntSound('death', 22050);
    // act
    const second = synthesizeJungleHuntSound('death', 22050);
    const fallback = synthesizeJungleHuntSound('death', Number.NaN);
    // assert
    expect(second).toEqual(first);
    expect(fallback.length).toBe(first.length * 2 - 1);
  });
});
