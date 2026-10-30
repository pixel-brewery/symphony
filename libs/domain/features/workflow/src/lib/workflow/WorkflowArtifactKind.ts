// #region Imports

import { workflowArtifactKinds } from './WorkflowArtifactKinds';

// #endregion

export type WorkflowArtifactKind = (typeof workflowArtifactKinds)[number];
