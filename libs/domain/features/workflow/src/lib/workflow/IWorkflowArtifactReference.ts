// #region Imports

import type { WorkflowArtifactKind } from './WorkflowArtifactKind';

// #endregion

export interface IWorkflowArtifactReference {
  readonly kind: WorkflowArtifactKind;
  readonly runId: string;
  readonly reference: string;
  readonly createdAt: string;
  readonly invalidatedAt?: string;
}
