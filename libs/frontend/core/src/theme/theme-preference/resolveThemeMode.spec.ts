// #region Imports

import { describe, expect, it } from 'vitest';
import { resolveThemeMode } from './';

// #endregion

describe('resolveThemeMode', () => {
  it.each([
    ['light', true, 'light'],
    ['dark', false, 'dark'],
    ['system', true, 'dark'],
    ['system', false, 'light'],
    [undefined, true, 'dark'],
  ] as const)('resolves %s with prefers-dark %s to %s', (preference, prefersDark, expected) => {
    // act
    const actual = resolveThemeMode(preference, prefersDark);

    // assert
    expect(actual).toBe(expected);
  });
});
