// #region Imports

import { Inject, inject, Injectable } from '@angular/core';
import type { IDeliveryProjectionValue } from '../ports/IDeliveryProjectionValue';
import { ApplicationSnapshot } from '@symphony/frontend-core/snapshot';

// #endregion

/** Applies Delivery's bounded writes to the existing transport projection. @public */
@Injectable()
export class DeliverySnapshotProjection {
  // #region Fields

  private readonly _state: ApplicationSnapshot;

  // #endregion

  // #region Ctor

  /** Connects the authoritative transport state without another writable snapshot. @public */
  public constructor(
    @Inject(ApplicationSnapshot) state: ApplicationSnapshot = inject(ApplicationSnapshot),
  ) {
    this._state = state;
  }

  // #endregion

  // #region Methods

  /**
   * Applies an existing Delivery result while preserving unrelated transport fields and absent snapshots.
   *
   * @param update - The owning operation's unchanged bounded result projection.
   * @public
   */
  public update(
    update: (value: IDeliveryProjectionValue | undefined) => IDeliveryProjectionValue | undefined,
  ): void {
    this._state.update((snapshot) => {
      const previous: IDeliveryProjectionValue | undefined = snapshot
        ? {
            executions: snapshot.executions,
            ...(snapshot.pullRequests === undefined ? {} : { pullRequests: snapshot.pullRequests }),
          }
        : undefined;
      const next = update(previous);
      if (!snapshot || next === previous || !next) return snapshot;
      return { ...snapshot, ...next };
    });
  }

  // #endregion
}
