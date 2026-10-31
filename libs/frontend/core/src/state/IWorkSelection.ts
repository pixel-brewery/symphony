// #region Imports

import type { Signal } from '@angular/core';

// #endregion

/**
 * Gives aggregate consumers commands into the single feature-owned work selection.
 *
 * @public
 */
export interface IWorkSelection {
  /** Current selected work-item identifier. @public @readonly */
  readonly selectedWorkItemId: Signal<string | undefined>;
  /** Whether an operator explicitly selected an item. @public @readonly */
  readonly selectionExplicit: Signal<boolean>;
  /** Records an explicit selection, including an explicit clear. @public */
  select(workItemId: string | undefined): void;
  /** Selects a saved item without changing explicit-selection history. @public */
  selectMutationResult(workItemId: string): void;
  /** Applies the snapshot default only while no item is selected. @public */
  ensureDefault(workItemId: string | undefined): void;
  /** Clears the identifier after an aggregate workspace import or deletion. @public */
  resetId(): void;
}
