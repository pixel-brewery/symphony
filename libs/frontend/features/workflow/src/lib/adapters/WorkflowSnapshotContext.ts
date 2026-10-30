// #region Imports

import { computed, Inject, inject, Injectable, type Signal } from '@angular/core';
import type { IWorkItem } from '@symphony/domain-work';
import type { IWorkflowDefinition } from '@symphony/domain-workflow';
import { ApplicationSnapshot } from '@symphony/frontend-core/snapshot';
import { OrchestrationSynchronizer } from '@symphony/frontend-core/synchronization';
import type { IWorkflowContext } from '../ports/IWorkflowContext';
import type { IWorkflowRefresh } from '../ports/IWorkflowRefresh';

// #endregion

/** Owns Workflow's work-item and process projections over the existing transport snapshot. @public */
@Injectable()
export class WorkflowSnapshotContext implements IWorkflowContext, IWorkflowRefresh {
  // #region Fields

  private readonly _workItems: Signal<readonly IWorkItem[]>;
  private readonly _workflow: Signal<IWorkflowDefinition | undefined>;

  // #endregion

  // #region Ctor

  /** Connects only the authoritative snapshot and shared refresh capability. @public */
  public constructor(
    @Inject(ApplicationSnapshot) snapshot: ApplicationSnapshot = inject(ApplicationSnapshot),
    @Inject(OrchestrationSynchronizer)
    private readonly _refresh: OrchestrationSynchronizer = inject(OrchestrationSynchronizer),
  ) {
    this._workItems = computed(() => snapshot.snapshot()?.workItems ?? []);
    this._workflow = computed(() => snapshot.snapshot()?.workflow);
  }

  // #endregion

  // #region Properties

  /** Work items from the single current snapshot. @public @readonly */
  public get workItems(): Signal<readonly IWorkItem[]> {
    return this._workItems;
  }
  /** Current provider-neutral process definition. @public @readonly */
  public get workflow(): Signal<IWorkflowDefinition | undefined> {
    return this._workflow;
  }

  // #endregion

  // #region Methods

  /** Reconciles through the existing coalesced refresh owner. @public */
  public refresh(): Promise<void> {
    return this._refresh.refresh();
  }

  // #endregion
}
