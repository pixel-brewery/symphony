// #region Imports

import { describe, expect, it } from 'vitest';
import { readCollapsedBoardColumnIds } from './';

// #endregion

describe('readCollapsedBoardColumnIds', () => {
  it('reads the persisted column ids', () => {
    // act
    // arrange
    const stored = readCollapsedBoardColumnIds({
      getItem: () => JSON.stringify(['ready', 'symphony:unassigned']),
    });

    // assert
    expect([...stored]).toEqual(['ready', 'symphony:unassigned']);
  });

  it('treats a missing preference as no collapsed column', () => {
    // assert
    expect(readCollapsedBoardColumnIds({ getItem: () => null }).size).toBe(0);
  });

  it.each(['not json', '{"ready":true}', '[1,2]'])('ignores the unusable payload %s', (payload) => {
    // assert
    expect(readCollapsedBoardColumnIds({ getItem: () => payload }).size).toBe(0);
  });

  it('keeps only the string ids of a partially unusable payload', () => {
    // act
    // arrange
    const stored = readCollapsedBoardColumnIds({ getItem: () => '["ready",7,null]' });

    // assert
    expect([...stored]).toEqual(['ready']);
  });
});
