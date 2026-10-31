// #region Imports

import type { DestroyRef } from '@angular/core';
import { Subject } from 'rxjs';
import { describe, expect, it } from 'vitest';
import { Hydratable } from './Hydratable';
import { ViewPresenter } from './ViewPresenter';

// #endregion

class ImmediatePresenter extends Hydratable(ViewPresenter) {}

class DeferredPresenter extends Hydratable(ViewPresenter) {
  // #region Fields

  public readonly hydration = new Subject<void>();

  // #endregion

  // #region Methods

  public override onHydrate(): Subject<void> {
    return this.hydration;
  }

  // #endregion
}

class PromisePresenter extends Hydratable(ViewPresenter) {
  // #region Fields

  public resolveHydration?: () => void;

  // #endregion

  // #region Methods

  public override onHydrate(): Promise<void> {
    return new Promise((resolve) => {
      this.resolveHydration = resolve;
    });
  }

  // #endregion
}

class RecoverablePresenter extends Hydratable(ViewPresenter) {
  // #region Fields

  public hydrationError?: unknown;

  // #endregion

  // #region Methods

  public override onHydrate(): Promise<void> {
    return Promise.reject(new Error('Hydration failed'));
  }

  public override onHydrationError(error: unknown): void {
    this.hydrationError = error;
  }

  // #endregion
}

describe('Hydratable presenter behavior', () => {
  it('finishes an empty hydration after the view can observe the state change', async () => {
    // arrange
    const presenter = new ImmediatePresenter(createDestroyRef());

    // act
    const actual = presenter.isHydrating();

    // assert
    expect(actual).toBe(true);
    presenter.initialize();
    expect(presenter.isHydrating()).toBe(true);
    await Promise.resolve();

    expect(presenter.isHydrating()).toBe(false);
  });

  it('keeps the view hydrating until an observable completes', () => {
    // arrange
    const presenter = new DeferredPresenter(createDestroyRef());

    presenter.initialize();
    // act
    presenter.hydration.next();
    // assert
    expect(presenter.isHydrating()).toBe(true);

    presenter.hydration.complete();
    expect(presenter.isHydrating()).toBe(false);
  });

  it('supports promise-based desktop IPC hydration', async () => {
    // arrange
    const presenter = new PromisePresenter(createDestroyRef());

    // act
    presenter.initialize();
    // assert
    expect(presenter.isHydrating()).toBe(true);
    presenter.resolveHydration?.();
    await Promise.resolve();

    expect(presenter.isHydrating()).toBe(false);
  });

  it('ends hydration when the presenter is disposed', () => {
    // arrange
    const presenter = new DeferredPresenter(createDestroyRef());
    presenter.initialize();

    // act
    presenter.dispose();

    // assert
    expect(presenter.isHydrating()).toBe(false);
    expect(presenter.disposed()).toBe(true);
  });

  it('leaves hydration and delegates unexpected errors to the recovery hook', async () => {
    // arrange
    const presenter = new RecoverablePresenter(createDestroyRef());

    presenter.initialize();
    // act
    await Promise.resolve();

    // assert
    expect(presenter.isHydrating()).toBe(false);
    expect(presenter.hydrationError).toEqual(new Error('Hydration failed'));
  });
});

function createDestroyRef(): DestroyRef {
  return {
    destroyed: false,
    onDestroy: () => (): void => undefined,
  };
}
