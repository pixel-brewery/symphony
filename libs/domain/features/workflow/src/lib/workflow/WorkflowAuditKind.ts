// #region Imports

import { workflowAuditKinds } from './WorkflowAuditKinds';

// #endregion

export type WorkflowAuditKind = (typeof workflowAuditKinds)[number];
