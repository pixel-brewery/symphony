// #region Imports

import { describe, expect, it, vi } from 'vitest';
import { hydrateActionsRoute } from './hydrateActionsRoute';

// #endregion

describe('hydrateActionsRoute', () => {
  it('requests the workflow catalogue after bootstrap and keeps initial hydration until it finishes', async () => {
    // arrange
    let completeBootstrap: () => void = () => undefined;
    let completeCatalogue: () => void = () => undefined;
    let startedCatalogue: () => void = () => undefined;
    const bootstrap = new Promise<void>((resolve) => {
      completeBootstrap = resolve;
    });
    const catalogue = new Promise<void>((resolve) => {
      completeCatalogue = resolve;
    });
    const catalogueStarted = new Promise<void>((resolve) => {
      startedCatalogue = resolve;
    });
    const refresh = vi.fn<(includeWorkflowCatalog?: boolean) => Promise<void>>(async () => {
      startedCatalogue();
      await catalogue;
    });
    let hydrated = false;

    // act
    const hydration = hydrateActionsRoute({
      initialize: () => bootstrap,
      refreshContinuousIntegrationRuns: refresh,
    }).then(() => {
      hydrated = true;
    });
    const startedBeforeBootstrap = refresh.mock.calls.length;
    completeBootstrap();
    await catalogueStarted;
    const finishedBeforeCatalogue = hydrated;
    completeCatalogue();
    await hydration;

    // assert
    expect(startedBeforeBootstrap).toBe(0);
    expect(refresh).toHaveBeenCalledExactlyOnceWith(true);
    expect(finishedBeforeCatalogue).toBe(false);
    expect(hydrated).toBe(true);
  });
});
