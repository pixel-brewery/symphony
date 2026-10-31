// #region Imports

import { DestroyRef, inject, Injectable, signal, type Signal } from '@angular/core';

// #endregion

const TICK_MILLISECONDS = 30_000;

/**
 * Shared wall clock for relative times such as `12 min` or `Synced with GitHub 2 min ago`.
 *
 * One timer serves every view, and it ticks every 30 seconds, which is as precise as a
 * minute-granular label needs to be.
 *
 * @public
 */
@Injectable({ providedIn: 'root' })
export class Clock {
  // #region Fields

  private readonly _now = signal(Date.now());

  // #endregion

  // #region Ctor

  /**
   * Starts the shared tick for the lifetime of the application injector.
   *
   * @public
   */
  public constructor() {
    const timer = setInterval(() => this._now.set(Date.now()), TICK_MILLISECONDS);
    inject(DestroyRef).onDestroy(() => clearInterval(timer));
  }

  // #endregion

  // #region Properties

  /**
   * Current time in epoch milliseconds, updated every 30 seconds.
   *
   * @public
   * @readonly
   */
  public get now(): Signal<number> {
    return this._now.asReadonly();
  }

  // #endregion
}
