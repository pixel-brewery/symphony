// #region Imports

import { describe, expect, it } from 'vitest';
import { AddedLineCountPipe } from './AddedLineCountPipe';

// #endregion

describe('AddedLineCountPipe', () => {
  it('counts the non-blank lines of the additions', () => {
    // arrange
    const pipe = new AddedLineCountPipe();

    // act
    const actual = [pipe.transform(''), pipe.transform('First\n\n  \nSecond\r\n')];

    // assert
    expect(actual).toEqual([0, 2]);
  });
});
