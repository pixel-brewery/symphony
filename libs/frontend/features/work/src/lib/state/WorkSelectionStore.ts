// #region Imports

import { Injectable, signal, type Signal } from '@angular/core';
import type { IWorkSelection } from '@symphony/frontend-core';

// #endregion

/**
 * Owns work-item selection independently of snapshot, transport and workspace lifecycles.
 *
 * @public
 */
@Injectable()
export class WorkSelectionStore implements IWorkSelection {
  // #region Fields

  private readonly _selectedWorkItemId = signal<string | undefined>(undefined);
  private readonly _selectionExplicit = signal(false);
  private readonly _publicSelectedWorkItemId = this._selectedWorkItemId.asReadonly();
  private readonly _publicSelectionExplicit = this._selectionExplicit.asReadonly();

  // #endregion

  // #region Properties

  /** Current selected work item. @public @readonly */
  public get selectedWorkItemId(): Signal<string | undefined> {
    return this._publicSelectedWorkItemId;
  }
  /** Whether the current selection was explicit. @public @readonly */
  public get selectionExplicit(): Signal<boolean> {
    return this._publicSelectionExplicit;
  }

  // #endregion

  // #region Methods

  /** Records an operator selection or clear. @public */
  public select(workItemId: string | undefined): void {
    this._selectionExplicit.set(Boolean(workItemId));
    this._selectedWorkItemId.set(workItemId);
  }

  /** Selects a mutation result without changing explicit-selection history. @public */
  public selectMutationResult(workItemId: string): void {
    this._selectedWorkItemId.set(workItemId);
  }

  /** Defaults the selection only if it is currently empty. @public */
  public ensureDefault(workItemId: string | undefined): void {
    this._selectedWorkItemId.update((current) => current ?? workItemId);
  }

  /** Preserves workspace-reset semantics while clearing the identifier. @public */
  public resetId(): void {
    this._selectedWorkItemId.set(undefined);
  }

  // #endregion
}
