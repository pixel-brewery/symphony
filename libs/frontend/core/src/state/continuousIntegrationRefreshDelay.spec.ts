// #region Imports

import { describe, expect, it } from 'vitest';
import { continuousIntegrationRefreshDelay } from './continuousIntegrationRefreshDelay';

// #endregion

describe('continuousIntegrationRefreshDelay', () => {
  it('stops polling cached remote runs after the provider failed', () => {
    // arrange
    const runs = [{ status: 'in-progress' as const }];

    // act
    const delay = continuousIntegrationRefreshDelay(false, runs, 'stale');

    // assert
    expect(delay).toBeUndefined();
  });

  it('keeps a local run live while the remote provider is stale', () => {
    // arrange
    const runs = [{ status: 'in-progress' as const }];

    // act
    const delay = continuousIntegrationRefreshDelay(true, runs, 'stale');

    // assert
    expect(delay).toBe(10_000);
  });

  it('polls current queued and running remote runs at bounded intervals', () => {
    // arrange
    const queued = [{ status: 'queued' as const }];
    const running = [{ status: 'in-progress' as const }];

    // act
    const queuedDelay = continuousIntegrationRefreshDelay(false, queued, 'current');
    const runningDelay = continuousIntegrationRefreshDelay(false, running, 'current');

    // assert
    expect(queuedDelay).toBe(30_000);
    expect(runningDelay).toBe(10_000);
  });
});
