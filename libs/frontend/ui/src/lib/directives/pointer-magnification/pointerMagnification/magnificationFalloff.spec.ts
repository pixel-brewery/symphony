// #region Imports

import { describe, expect, it } from 'vitest';
import { magnificationFalloff } from './';

// #endregion

const RADIUS = 96;

describe('magnificationFalloff', () => {
  it('peaks under the pointer, dies at the radius and flattens at both ends', () => {
    // act
    const peak = magnificationFalloff(0, RADIUS);
    const half = magnificationFalloff(RADIUS / 2, RADIUS);
    const edge = magnificationFalloff(RADIUS, RADIUS);
    const beyond = magnificationFalloff(RADIUS * 4, RADIUS);

    // assert
    expect(peak).toBe(1);
    expect(half).toBeCloseTo(0.5, 12);
    expect(edge).toBe(0);
    expect(beyond).toBe(0);
    expect(magnificationFalloff(-30, RADIUS)).toBeCloseTo(magnificationFalloff(30, RADIUS), 12);
    const nearPeak = (magnificationFalloff(0, RADIUS) - magnificationFalloff(0.5, RADIUS)) / 0.5;
    const nearEdge =
      (magnificationFalloff(RADIUS - 0.5, RADIUS) - magnificationFalloff(RADIUS, RADIUS)) / 0.5;
    expect(Math.abs(nearPeak)).toBeLessThan(0.001);
    expect(Math.abs(nearEdge)).toBeLessThan(0.001);
  });
});
