// #region Imports

import type { IWorkflowStage } from '@symphony/domain-workflow';
import type { IExecutionRecord } from '../model/IExecutionRecord';
import type { ProjectFieldDefinition } from '@symphony/domain-work';
import type { IWorkItemReadiness } from '@symphony/domain-workflow';

// #endregion

export interface IWorkItemInspectionContext {
  readonly stages: readonly IWorkflowStage[];
  /** Field definitions of the board that owns the item. */
  readonly fields: readonly ProjectFieldDefinition[];
  /** Label of the provider column the item sits in, when one is known. */
  readonly boardColumnLabel?: string;
  /**
   * Execution history, ideally already narrowed to this item. Omitted while the history is
   * not loaded: a caller that cannot see the runs must not make the item look as if it had
   * none, so every finding that reads this stays silent instead of guessing.
   */
  readonly executions?: readonly IExecutionRecord[];
  /**
   * What the stage guards would find for this item, projected from the supervisor record. A
   * finding derived from it names the same condition the guard would name. Omitted while the
   * projection is not loaded: every finding that reads this stays silent rather than declaring
   * an item unprovable because the caller could not see its state.
   */
  readonly readiness?: IWorkItemReadiness;
}
