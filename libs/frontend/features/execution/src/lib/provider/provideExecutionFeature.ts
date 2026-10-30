// #region Imports

import { makeEnvironmentProviders, type EnvironmentProviders } from '@angular/core';
import { ORCHESTRATION_CLIENT } from '@symphony/frontend-core';
import { EXECUTION_OPERATIONS, EXECUTION_ACTIVITY } from '@symphony/frontend-core/execution';
import { ExecutionStore } from '../state/ExecutionStore';
import { ExecutionSnapshotContext } from '../adapters/ExecutionSnapshotContext';
import { createExecutionRuntime } from '../adapters/createExecutionRuntime';
import { ExecutionControls } from '../state/ExecutionControls';
import { ExecutionSynchronizer } from '../state/ExecutionSynchronizer';
import { createExecutionActivityState } from '../state/createExecutionActivityState';
import { EXECUTION_CONTEXT } from '../ports/ExecutionContextToken';
import { EXECUTION_PROJECTION } from '../ports/ExecutionProjectionToken';
import { EXECUTION_REFRESH } from '../ports/ExecutionRefreshToken';
import { EXECUTION_RUNTIME } from '../ports/ExecutionRuntimeToken';
import { EXECUTION_SYNCHRONIZATION } from '../ports/ExecutionSynchronizationToken';
import { EXECUTION_CLIENT } from '../ports/ExecutionClientToken';
import { APPLICATION_BOOTSTRAP_EXECUTION } from '@symphony/frontend-core/bootstrap';

// #endregion

/** Registers one Execution state and lifecycle owner behind bounded Core contracts. @public */
export function provideExecutionFeature(): EnvironmentProviders {
  return makeEnvironmentProviders([
    ExecutionStore,
    ExecutionSnapshotContext,
    { provide: APPLICATION_BOOTSTRAP_EXECUTION, useExisting: ExecutionStore },
    ExecutionSynchronizer,
    ExecutionControls,
    { provide: EXECUTION_CONTEXT, useExisting: ExecutionSnapshotContext },
    { provide: EXECUTION_PROJECTION, useExisting: ExecutionSnapshotContext },
    { provide: EXECUTION_REFRESH, useExisting: ExecutionSnapshotContext },
    { provide: EXECUTION_RUNTIME, useFactory: createExecutionRuntime },
    { provide: EXECUTION_CLIENT, useExisting: ORCHESTRATION_CLIENT },
    { provide: EXECUTION_SYNCHRONIZATION, useExisting: ExecutionSynchronizer },
    { provide: EXECUTION_OPERATIONS, useExisting: ExecutionStore },
    { provide: EXECUTION_ACTIVITY, useFactory: createExecutionActivityState },
  ]);
}
