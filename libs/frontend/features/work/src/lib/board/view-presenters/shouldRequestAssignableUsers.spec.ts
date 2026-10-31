// #region Imports

import { describe, expect, it } from 'vitest';
import { shouldRequestAssignableUsers } from './shouldRequestAssignableUsers';

// #endregion

describe('shouldRequestAssignableUsers', () => {
  it('stops automatic retries after a provider failure', () => {
    // act
    const shouldRequest = shouldRequestAssignableUsers(false, false, true, false);

    // assert
    expect(shouldRequest).toBe(false);
  });

  it('allows a user-triggered card menu to retry the failed scope once', () => {
    // act
    const shouldRequest = shouldRequestAssignableUsers(false, false, true, true);

    // assert
    expect(shouldRequest).toBe(true);
  });

  it('does not duplicate a loaded or in-flight request', () => {
    // act
    const loaded = shouldRequestAssignableUsers(true, false, false, true);
    const loading = shouldRequestAssignableUsers(false, true, false, true);

    // assert
    expect({ loaded, loading }).toEqual({ loaded: false, loading: false });
  });
});
