// #region Imports

import { describe, expect, it } from 'vitest';
import { SettingsSearchHighlightPipe } from './SettingsSearchHighlightPipe';

// #endregion

describe('SettingsSearchHighlightPipe', () => {
  it('marks every case-insensitive occurrence of the query words', () => {
    // arrange
    const pipe = new SettingsSearchHighlightPipe();

    // act
    const parts = pipe.transform('Token budget and daily TOKEN', 'token');

    // assert
    expect(parts).toEqual([
      { text: 'Token', match: true },
      { text: ' budget and daily ', match: false },
      { text: 'TOKEN', match: true },
    ]);
  });

  it('returns the text as one unmarked part when nothing matches', () => {
    // arrange
    const pipe = new SettingsSearchHighlightPipe();

    // act
    const parts = pipe.transform('Release channel', 'sleep');

    // assert
    expect(parts).toEqual([{ text: 'Release channel', match: false }]);
  });
});
