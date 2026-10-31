// #region Imports

import { describe, expect, it } from 'vitest';
import { SignedNumberPipe } from './SignedNumberPipe';

// #endregion

describe('SignedNumberPipe', () => {
  it('signs changes with a plus or a typographic minus and leaves no change unsigned', () => {
    // arrange
    const pipe = new SignedNumberPipe();

    // act
    const labels = [
      pipe.transform(3),
      pipe.transform(-0.84, 1),
      pipe.transform(0),
      pipe.transform(-0.01, 1),
    ];

    // assert
    expect(labels).toEqual(['+3', '−0.8', '0', '0']);
  });
});
