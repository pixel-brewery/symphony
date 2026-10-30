// #region Imports
import type { DestroyRef } from '@angular/core';
import { describe, expect, it, vi } from 'vitest';
import { ViewPresenter } from './ViewPresenter';
// #endregion

class TestViewPresenter extends ViewPresenter {
  // #region Properties

  public get cancellationSignal(): AbortSignal {
    return this.abortRef.signal;
  }

  // #endregion

  // #region Methods

  public track<T>(operation: () => Promise<T>): Promise<T> {
    return this.withLoading(operation);
  }

  // #endregion
}

function destroyRef(): DestroyRef {
  return { destroyed: false, onDestroy: vi.fn() } as unknown as DestroyRef;
}

describe('ViewPresenter', () => {
  it('owns an idempotent view lifecycle', () => {
    // arrange
    const presenter = new TestViewPresenter(destroyRef());

    // act
    presenter.initialize();
    presenter.initialize();
    presenter.dispose();
    presenter.dispose();

    // assert
    expect(presenter.initialized()).toBe(true);
    expect(presenter.disposed()).toBe(true);
    expect(presenter.cancellationSignal.aborted).toBe(true);
  });

  it('balances loading state around presenter-owned asynchronous work', async () => {
    // arrange
    let complete = (): void => undefined;
    const operation = new Promise<void>((resolve) => {
      complete = resolve;
    });
    const presenter = new TestViewPresenter(destroyRef());

    // act
    const tracked = presenter.track(() => operation);

    // assert
    expect(presenter.isLoading()).toBe(true);
    complete();
    await tracked;
    expect(presenter.isLoading()).toBe(false);
  });
});
