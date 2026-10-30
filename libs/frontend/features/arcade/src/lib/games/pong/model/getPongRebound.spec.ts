// #region Imports

import { describe, expect, it } from 'vitest';
import { getPongRebound } from './getPongRebound';

// #endregion

describe('getPongRebound', () => {
  it('reproduces all eight original contact zones when both paddle counters agree', () => {
    // arrange
    const counters = [0, 2, 4, 6, 8, 10, 12, 14];
    // act
    const speeds = counters.map((counter) => getPongRebound(counter, counter));
    // assert
    expect(speeds).toEqual([-3, -2, -1, 0, 0, 1, 2, 3]);
  });

  it('retains the original A6 wiring error instead of calculating a generic reflection angle', () => {
    // arrange
    const contact = 4;
    // act
    const beforeOtherPaddle = getPongRebound(contact, 0);
    const afterOtherPaddle = getPongRebound(contact, 15);
    // assert
    expect(beforeOtherPaddle).toBe(-1);
    expect(afterOtherPaddle).toBe(0);
    expect(getPongRebound(14, -10)).toBe(2);
    expect(getPongRebound(14, 50)).toBe(3);
  });
});
