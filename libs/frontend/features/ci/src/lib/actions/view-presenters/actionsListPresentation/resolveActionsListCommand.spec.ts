// #region Imports

import { describe, expect, it } from 'vitest';
import { resolveActionsListCommand } from './';

// #endregion

describe('resolveActionsListCommand', () => {
  it('maps a status option to a status command and All statuses back to no filter', () => {
    // act
    const actual = resolveActionsListCommand({ menuId: 'status', optionId: 'failed' });

    // assert
    expect(actual).toEqual({ kind: 'status', status: 'failed' });
    expect(resolveActionsListCommand({ menuId: 'status', optionId: 'all-statuses' })).toEqual({
      kind: 'status',
      status: undefined,
    });
    expect(resolveActionsListCommand({ menuId: 'status', optionId: 'bogus' })).toBeUndefined();
  });

  it('maps an actor option to an actor command and Everyone back to no filter', () => {
    // act
    const actual = resolveActionsListCommand({ menuId: 'actor', optionId: 'actor:alice' });

    // assert
    expect(actual).toEqual({ kind: 'actor', actor: 'alice' });
    expect(resolveActionsListCommand({ menuId: 'actor', optionId: 'everyone' })).toEqual({
      kind: 'actor',
      actor: undefined,
    });
  });

  it('maps sort options and rejects selections of unknown menus or sorts', () => {
    // act
    const actual = resolveActionsListCommand({ menuId: 'sort', optionId: 'started-ascending' });

    // assert
    expect(actual).toEqual({ kind: 'sort', sort: 'started-ascending' });
    expect(resolveActionsListCommand({ menuId: 'sort', optionId: 'bogus' })).toBeUndefined();
    expect(resolveActionsListCommand({ menuId: 'unknown', optionId: 'everyone' })).toBeUndefined();
  });
});
