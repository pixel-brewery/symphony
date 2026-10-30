// #region Imports

import type { Signal } from '@angular/core';
import type { IWorkItem } from '@symphony/domain-work';
import type { IWorkflowDefinition } from '@symphony/domain-workflow';

// #endregion

/** Read-only Work and process projections consumed by Workflow surfaces. @public */
export interface IWorkflowContext {
  readonly workItems: Signal<readonly IWorkItem[]>;
  readonly workflow: Signal<IWorkflowDefinition | undefined>;
}
