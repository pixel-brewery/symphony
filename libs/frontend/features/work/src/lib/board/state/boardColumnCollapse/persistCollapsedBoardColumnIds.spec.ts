// #region Imports

import { describe, expect, it, vi } from 'vitest';
import { COLLAPSED_BOARD_COLUMNS_STORAGE_KEY, persistCollapsedBoardColumnIds } from './';

// #endregion

describe('persistCollapsedBoardColumnIds', () => {
  it('persists the collapsed columns under the board preference key', () => {
    // arrange
    const setItem = vi.fn();

    // act
    persistCollapsedBoardColumnIds(new Set(['ready', 'progress']), { setItem });

    // assert
    expect(setItem).toHaveBeenCalledWith(
      COLLAPSED_BOARD_COLUMNS_STORAGE_KEY,
      JSON.stringify(['ready', 'progress']),
    );
  });
});
