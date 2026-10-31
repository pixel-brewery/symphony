// #region Imports

import type { IWorkflowRecord } from '../workflow';

// #endregion

/**
 * The parts of the runtime record the projection reads. Narrower than `IWorkflowRecord` so the
 * renderer can pass the transport shape, which carries only what crosses the process boundary.
 */
export type WorkflowGraphRecord = Pick<IWorkflowRecord, 'stageId' | 'runtimeState'>;
