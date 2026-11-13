// #region Imports

import { describe, expect, it } from 'vitest';
import { CaliforniaGamesMusic } from './CaliforniaGamesMusic';
import type { CaliforniaGamesMusicCue } from './CaliforniaGamesMusicCue';

// #endregion

describe('CaliforniaGamesMusic', () => {
  it.each<CaliforniaGamesMusicCue>([
    'title',
    'high-scores',
    'bmx',
    'surfing',
    'half-pipe',
    'foot-bag',
  ])('renders a bounded non-silent mono loop for %s', (cue) => {
    // arrange
    const sampleRate = 8000;

    // act
    const samples = CaliforniaGamesMusic.render(cue, sampleRate);

    // assert
    expect(samples.length).toBeGreaterThan(sampleRate * 3);
    expect(samples.length).toBeLessThan(sampleRate * 20);
    expect(samples.some((sample) => Math.abs(sample) > 0.01)).toBe(true);
    expect(samples.every((sample) => Math.abs(sample) <= 1)).toBe(true);
  });

  it('renders silence as one sample without allocating a loop', () => {
    // arrange
    const sampleRate = 8000;

    // act
    const samples = CaliforniaGamesMusic.render('silent', sampleRate);

    // assert
    expect(samples).toEqual(new Float32Array(1));
  });
});
