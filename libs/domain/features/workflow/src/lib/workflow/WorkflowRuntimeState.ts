// #region Imports

import { workflowRuntimeStates } from './WorkflowRuntimeStates';

// #endregion

export type WorkflowRuntimeState = (typeof workflowRuntimeStates)[number];
