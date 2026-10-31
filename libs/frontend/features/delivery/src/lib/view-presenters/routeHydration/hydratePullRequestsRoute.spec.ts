// #region Imports

import { describe, expect, it, vi } from 'vitest';
import { hydratePullRequestsRoute } from './';

// #endregion

describe('hydratePullRequestsRoute', () => {
  it('waits for initialization before refreshing both Pull Request data sources', async () => {
    // arrange
    const initialization = deferred();
    const snapshotRefresh = deferred();
    const runRefresh = deferred();
    const store = {
      initialize: vi.fn(() => initialization.promise),
      refresh: vi.fn(() => snapshotRefresh.promise),
      refreshContinuousIntegrationRuns: vi.fn(() => runRefresh.promise),
    };
    let completed = false;
    // act
    const hydration = hydratePullRequestsRoute(store).then(() => {
      completed = true;
    });

    // assert
    expect(store.refresh).not.toHaveBeenCalled();
    initialization.resolve();
    await flushPromises();
    expect(store.refresh).toHaveBeenCalledOnce();
    expect(store.refreshContinuousIntegrationRuns).toHaveBeenCalledOnce();
    expect(completed).toBe(false);

    snapshotRefresh.resolve();
    runRefresh.resolve();
    await hydration;
    expect(completed).toBe(true);
  });
});

function deferred(): { readonly promise: Promise<void>; resolve(): void } {
  let resolvePromise: () => void = () => undefined;
  const promise = new Promise<void>((resolve) => {
    resolvePromise = resolve;
  });
  return { promise, resolve: () => resolvePromise() };
}

async function flushPromises(): Promise<void> {
  await Promise.resolve();
  await Promise.resolve();
}
