// #region Imports

import type { WorkflowStageId } from '@symphony/domain-workflow';
import type { AssistanceAction } from './AssistanceAction';

// #endregion

export interface IProjectFieldOption {
  id: string;
  label: string;
  description?: string;
  color?: string;
  startDate?: string;
  duration?: number;
  stageId?: WorkflowStageId;
  assistanceAction?: AssistanceAction;
}
