// #region Imports

import { describe, expect, it, vi } from 'vitest';
import { persistThemePreference, THEME_PREFERENCE_STORAGE_KEY } from './';

// #endregion

describe('persistThemePreference', () => {
  it('persists the preference under the existing Symphony settings key', () => {
    // arrange
    const setItem = vi.fn();

    // act
    persistThemePreference('dark', { setItem });

    // assert
    expect(setItem).toHaveBeenCalledWith(THEME_PREFERENCE_STORAGE_KEY, 'dark');
  });
});
