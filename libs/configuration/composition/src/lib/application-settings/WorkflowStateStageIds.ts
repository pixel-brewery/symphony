// #region Imports

import { type WorkflowStageId } from '@symphony/domain-workflow';
import type { LegacyWorkflowState } from './LegacyWorkflowState';

// #endregion

export /**
 * Stage of the shipped workflow that replaces a former internal workflow state.
 *
 * `blocked` and `failed` have no stage: they became runtime states beside the stage, so a
 * column that used them stays unmapped and its work items stay visible and neutral until a
 * person maps the column deliberately.
 */
const workflowStateStageIds: Readonly<Partial<Record<LegacyWorkflowState, WorkflowStageId>>> = {
  backlog: 'backlog',
  ready: 'qualified',
  analyzing: 'qualified',
  planned: 'ready',
  executing: 'progress',
  review: 'acceptance',
  completed: 'done',
};
