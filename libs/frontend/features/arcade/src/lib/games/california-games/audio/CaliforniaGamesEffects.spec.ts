// #region Imports

import { describe, expect, it } from 'vitest';
import { CaliforniaGamesEffects } from './CaliforniaGamesEffects';
import type { ICaliforniaGamesSoundEvent } from './ICaliforniaGamesSoundEvent';

// #endregion

describe('CaliforniaGamesEffects', () => {
  it.each<ICaliforniaGamesSoundEvent['kind']>([
    'menu-move',
    'menu-select',
    'countdown',
    'jump',
    'land',
    'crash',
    'score',
    'wipeout',
    'kick',
    'fall',
    'time-warning',
    'high-score',
    'finish',
  ])('renders a finite four-channel effect for %s', (kind) => {
    // arrange
    const sampleRate = 8000;

    // act
    const samples = CaliforniaGamesEffects.render(kind, sampleRate);

    // assert
    expect(samples.length).toBeGreaterThan(100);
    expect(samples.some((sample) => Math.abs(sample) > 0.01)).toBe(true);
    expect(samples.every((sample) => Number.isFinite(sample) && Math.abs(sample) <= 1)).toBe(true);
  });
});
