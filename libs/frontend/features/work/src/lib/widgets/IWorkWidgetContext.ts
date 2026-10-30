// #region Imports

import type { Signal } from '@angular/core';
import type { IWorkItem, IBoardColumn, ProjectFieldDefinition } from '@symphony/domain-work';
import type { IExecutionRecord } from '@symphony/domain-execution';
import type { IWorkflowStage, IWorkItemReadiness } from '@symphony/domain-workflow';

// #endregion

/** The existing Work and workflow facts consumed by the Board mosaic. @public */
export interface IWorkWidgetContext {
  readonly snapshot: Signal<
    | {
        readonly boardColumns: readonly IBoardColumn[];
        readonly executions: readonly IExecutionRecord[];
        readonly workflow: { readonly stages: readonly IWorkflowStage[] };
        readonly projectFields?: readonly ProjectFieldDefinition[];
        readonly workItemReadiness?: readonly IWorkItemReadiness[];
      }
    | undefined
  >;
  readonly scopedWorkItems: Signal<readonly IWorkItem[]>;
  readonly activeBoard: Signal<{ readonly id: string } | undefined>;
}
