// #region Imports

import type { ProjectFieldValue } from './ProjectFieldValue';

// #endregion

export interface IIssueDraftRequest {
  operationId: string;
  workspaceId?: string;
  /** Board (work-item source) whose fields and columns the draft targets. */
  sourceId?: string;
  repository: string;
  prompt: string;
  /** Agent that should formulate the draft; defaults to the workspace creation assignment. */
  agentProfileId?: string;
  title?: string;
  body?: string;
  projectFields?: readonly ProjectFieldValue[];
}
