// #region Imports

import { describe, expect, it } from 'vitest';
import { isWorkItemScopeUnavailable } from './isWorkItemScopeUnavailable';

// #endregion

describe('isWorkItemScopeUnavailable', () => {
  it('does not treat another workspace cache as data for an empty selected scope', () => {
    // act
    const unavailable = isWorkItemScopeUnavailable(
      { state: 'stale', reason: 'authentication-required' },
      0,
    );

    // assert
    expect(unavailable).toBe(true);
  });

  it('keeps a stale cache usable when the selected scope has work items', () => {
    // act
    const unavailable = isWorkItemScopeUnavailable({ state: 'stale' }, 312);

    // assert
    expect(unavailable).toBe(false);
  });

  it('preserves the provider unavailable state regardless of scoped items', () => {
    // act
    const unavailable = isWorkItemScopeUnavailable({ state: 'unavailable' }, 0);

    // assert
    expect(unavailable).toBe(true);
  });
});
