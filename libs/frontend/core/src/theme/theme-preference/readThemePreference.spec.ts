// #region Imports

import { describe, expect, it } from 'vitest';
import { readThemePreference } from './';

// #endregion

describe('readThemePreference', () => {
  it.each(['light', 'dark', 'system'] as const)('reads the supported %s preference', (value) => {
    // act
    const actual = readThemePreference({ getItem: () => value });

    // assert
    expect(actual).toBe(value);
  });

  it('ignores unsupported stored values', () => {
    // act
    const actual = readThemePreference({ getItem: () => 'contrast' });

    // assert
    expect(actual).toBeUndefined();
  });
});
