// #region Imports

import { describe, expect, it, vi } from 'vitest';
import { hydrateBoardRoute } from './';

// #endregion

describe('hydrateBoardRoute', () => {
  it('shows an available snapshot without waiting for global initialization', async () => {
    // arrange
    const initialization = deferred();
    const store = {
      snapshot: vi.fn(() => ({ workItems: [] })),
      initialize: vi.fn(() => initialization.promise),
      refresh: vi.fn(() => Promise.resolve()),
    };

    // act
    await hydrateBoardRoute(store);

    // assert
    expect(store.initialize).toHaveBeenCalledOnce();
    expect(store.refresh).toHaveBeenCalledOnce();
    expect(store.refresh).toHaveBeenCalledWith();
  });

  it('waits for initial snapshot hydration before starting the provider refresh', async () => {
    // arrange
    const initialization = deferred();
    const state: { snapshot?: unknown } = {};
    const store = {
      snapshot: vi.fn(() => state.snapshot),
      initialize: vi.fn(() => initialization.promise),
      refresh: vi.fn(() => Promise.resolve()),
    };
    let completed = false;

    // act
    const hydration = hydrateBoardRoute(store).then(() => {
      completed = true;
    });

    // assert
    expect(store.refresh).not.toHaveBeenCalled();
    expect(completed).toBe(false);
    state.snapshot = { workItems: [] };
    initialization.resolve();
    await hydration;
    expect(store.refresh).toHaveBeenCalledOnce();
    expect(store.refresh).toHaveBeenCalledWith();
    expect(completed).toBe(true);
  });

  it('joins the cached snapshot read when initialization finishes without a snapshot', async () => {
    // arrange
    const cachedRead = deferred();
    const state: { snapshot?: unknown } = {};
    const store = {
      snapshot: vi.fn(() => state.snapshot),
      initialize: vi.fn(() => Promise.resolve()),
      refresh: vi.fn((force?: boolean) =>
        force === false ? cachedRead.promise : Promise.resolve(),
      ),
    };
    let completed = false;

    // act
    const hydration = hydrateBoardRoute(store).then(() => {
      completed = true;
    });
    await Promise.resolve();
    await Promise.resolve();

    // assert
    expect(store.refresh).toHaveBeenCalledWith(false);
    expect(completed).toBe(false);
    state.snapshot = { workItems: [] };
    cachedRead.resolve();
    await hydration;
    expect(store.refresh).toHaveBeenCalledTimes(2);
    expect(store.refresh).toHaveBeenLastCalledWith();
    expect(completed).toBe(true);
  });

  it('waits for the provider projection when no cached snapshot exists', async () => {
    // arrange
    const providerRefresh = deferred();
    const store = {
      snapshot: vi.fn(() => undefined),
      initialize: vi.fn(() => Promise.resolve()),
      refresh: vi.fn((force?: boolean) =>
        force === false ? Promise.resolve() : providerRefresh.promise,
      ),
    };
    let completed = false;

    // act
    const hydration = hydrateBoardRoute(store).then(() => {
      completed = true;
    });
    for (let tick = 0; tick < 4; tick += 1) await Promise.resolve();

    // assert
    expect(store.refresh).toHaveBeenNthCalledWith(1, false);
    expect(store.refresh).toHaveBeenNthCalledWith(2);
    expect(completed).toBe(false);
    providerRefresh.resolve();
    await hydration;
    expect(store.refresh).toHaveBeenCalledTimes(2);
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
