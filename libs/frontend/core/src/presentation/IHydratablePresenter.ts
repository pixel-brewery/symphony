// #region Imports

import { type Signal } from '@angular/core';
import type { HydrationOperation } from './HydrationOperation';

// #endregion

export interface IHydratablePresenter {
  readonly isHydrating: Signal<boolean>;
  onHydrate(): HydrationOperation;
  onHydrationError(error: unknown): void;
}
