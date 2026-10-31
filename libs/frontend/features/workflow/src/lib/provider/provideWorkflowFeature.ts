// #region Imports

import { makeEnvironmentProviders, type EnvironmentProviders } from '@angular/core';
import { ORCHESTRATION_CLIENT } from '@symphony/frontend-core';
import { WorkflowSnapshotContext } from '../adapters/WorkflowSnapshotContext';
import { WORKFLOW_OPERATIONS } from '@symphony/frontend-core/workflow';
import { WorkflowStore } from '../state/WorkflowStore';
import { WORKFLOW_CLIENT } from '../ports/WorkflowClientToken';
import { WORKFLOW_CONTEXT } from '../ports/WorkflowContextToken';
import { WORKFLOW_REFRESH } from '../ports/WorkflowRefreshToken';

// #endregion

/** Registers the Workflow owner without a concrete Work or Execution feature dependency. @public */
export function provideWorkflowFeature(): EnvironmentProviders {
  return makeEnvironmentProviders([
    WorkflowStore,
    WorkflowSnapshotContext,
    { provide: WORKFLOW_CLIENT, useExisting: ORCHESTRATION_CLIENT },
    { provide: WORKFLOW_CONTEXT, useExisting: WorkflowSnapshotContext },
    { provide: WORKFLOW_REFRESH, useExisting: WorkflowSnapshotContext },
    { provide: WORKFLOW_OPERATIONS, useExisting: WorkflowStore },
  ]);
}
