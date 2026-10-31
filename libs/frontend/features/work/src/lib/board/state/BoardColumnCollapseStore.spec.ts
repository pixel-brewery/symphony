// #region Imports

import { describe, expect, it } from 'vitest';
import { BoardColumnCollapseStore } from './BoardColumnCollapseStore';
import {
  COLLAPSED_BOARD_COLUMNS_STORAGE_KEY,
  EXPANDED_BOARD_COLUMNS_STORAGE_KEY,
} from './boardColumnCollapse';

// #endregion

function memoryStorage(initial: Record<string, string> = {}): Storage {
  const values = new Map(Object.entries(initial));
  return {
    get length() {
      return values.size;
    },
    clear: () => values.clear(),
    getItem: (key) => values.get(key) ?? null,
    key: (index) => [...values.keys()][index] ?? null,
    removeItem: (key) => void values.delete(key),
    setItem: (key, value) => void values.set(key, value),
  };
}

describe('BoardColumnCollapseStore', () => {
  it('follows the column default until the operator toggles it', () => {
    // arrange
    const store = new BoardColumnCollapseStore(memoryStorage());

    // act
    const collapsedByDefault = store.isExpanded('backlog', false);
    const expandedByDefault = store.isExpanded('ready');

    // assert
    expect(collapsedByDefault).toBe(false);
    expect(expandedByDefault).toBe(true);
  });

  it('remembers an explicit choice in either direction across instances', () => {
    // arrange
    const storage = memoryStorage();
    const store = new BoardColumnCollapseStore(storage);

    // act
    store.setExpanded('backlog', true);
    store.setExpanded('ready', false);
    const restored = new BoardColumnCollapseStore(storage);

    // assert
    expect(restored.isExpanded('backlog', false)).toBe(true);
    expect(restored.isExpanded('ready', true)).toBe(false);
    expect(storage.getItem(EXPANDED_BOARD_COLUMNS_STORAGE_KEY)).toBe(JSON.stringify(['backlog']));
    expect(storage.getItem(COLLAPSED_BOARD_COLUMNS_STORAGE_KEY)).toBe(JSON.stringify(['ready']));
  });

  it('keeps the columns an earlier version stored as collapsed', () => {
    // arrange
    const storage = memoryStorage({
      [COLLAPSED_BOARD_COLUMNS_STORAGE_KEY]: JSON.stringify(['progress']),
    });

    // act
    const store = new BoardColumnCollapseStore(storage);

    // assert
    expect(store.isExpanded('progress')).toBe(false);
  });
});
