// #region Imports

import { workflowStageKinds } from './WorkflowStageKinds';

// #endregion

export type WorkflowStageKind = (typeof workflowStageKinds)[number];
