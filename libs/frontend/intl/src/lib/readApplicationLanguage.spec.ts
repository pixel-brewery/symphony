// #region Imports

import { describe, expect, it } from 'vitest';
import { readApplicationLanguage } from './readApplicationLanguage';

// #endregion

describe('readApplicationLanguage', () => {
  it('restores only supported saved languages', () => {
    // arrange
    const german = { getItem: () => 'de' };
    const unsupported = { getItem: () => 'fr' };

    // act
    const restored = [
      readApplicationLanguage(german),
      readApplicationLanguage(unsupported),
      readApplicationLanguage(),
    ];

    // assert
    expect(restored).toEqual(['de', 'en', 'en']);
  });

  it('uses English when browser storage is blocked', () => {
    // arrange
    const storage = {
      getItem: (): string => {
        throw new Error('blocked');
      },
    };

    // act
    const language = readApplicationLanguage(storage);

    // assert
    expect(language).toBe('en');
  });
});
