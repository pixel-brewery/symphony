// #region Imports

import { describe, expect, it } from 'vitest';
import { shouldShowActionsRemoteDataNotice } from './shouldShowActionsRemoteDataNotice';

// #endregion

describe('shouldShowActionsRemoteDataNotice', () => {
  it('leaves the Actions page as the single owner of its remote-data notice', () => {
    // arrange
    const status = { state: 'stale' as const, reason: 'rate-limited' as const };

    // act
    const visible = shouldShowActionsRemoteDataNotice('/main/actions', status, undefined);

    // assert
    expect(visible).toBe(false);
  });

  it('does not repeat one GitHub rate-limit incident beside the pull-request notice', () => {
    // arrange
    const status = { state: 'stale' as const, reason: 'rate-limited' as const };

    // act
    const visible = shouldShowActionsRemoteDataNotice('/main/pull-requests', status, status);

    // assert
    expect(visible).toBe(false);
  });

  it('keeps an independent Actions failure visible from another route', () => {
    // arrange
    const actions = { state: 'stale' as const };

    // act
    const visible = shouldShowActionsRemoteDataNotice('/main/board', actions, undefined);

    // assert
    expect(visible).toBe(true);
  });
});
