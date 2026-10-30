// #region Imports

import { Inject, inject, Injectable, type Signal } from '@angular/core';
import type { IOrchestrationSnapshot } from '@symphony/ipc-contracts-composition';
import { OrchestrationState } from './OrchestrationState';

// #endregion

/**
 * Gives feature-owned projections one bounded update path to the existing transport snapshot.
 *
 * @public
 */
@Injectable({ providedIn: 'root' })
export class ApplicationSnapshot {
  // #region Ctor

  /**
   * Connects the existing single snapshot signal without copying its state.
   *
   * @public
   */
  public constructor(
    @Inject(OrchestrationState)
    private readonly _state: OrchestrationState = inject(OrchestrationState),
  ) {}

  // #endregion

  // #region Properties

  /**
   * The authoritative transport snapshot as a readonly signal.
   *
   * @public
   * @readonly
   */
  public get snapshot(): Signal<IOrchestrationSnapshot | undefined> {
    return this._state.snapshot.asReadonly();
  }

  // #endregion

  // #region Methods

  /**
   * Applies a typed feature-owned update to the same snapshot signal.
   *
   * @param update - Immutable update preserving fields owned by other features.
   * @public
   */
  public update(
    update: (current: IOrchestrationSnapshot | undefined) => IOrchestrationSnapshot | undefined,
  ): void {
    this._state.snapshot.update(update);
  }

  // #endregion
}
