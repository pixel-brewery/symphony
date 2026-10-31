// #region Imports

import type {
  ICiRun,
  ICiRunDetails,
  ICiRunLogChunk,
  ICiWorkflow,
  ILocalCiExecution,
} from '@symphony/domain-ci';

// #endregion

export interface IContinuousIntegrationPort {
  listWorkflows?(): Promise<readonly ICiWorkflow[]>;
  listRuns(scope?: 'selected' | 'operational'): Promise<readonly ICiRun[]>;
  listManagedLocalRunCandidates?(): Promise<readonly ICiRun[]>;
  dispatchWorkflow?(
    workflowId: string,
    ref: string,
    options?: { readonly local?: boolean; readonly inputs?: Readonly<Record<string, string>> },
  ): Promise<ICiRun>;
  getRunDetails?(runId: string): Promise<ICiRunDetails>;
  getRunLogChunk?(
    runId: string,
    kind: 'output' | 'failure',
    offset: number,
  ): Promise<ICiRunLogChunk>;
  cancelRun?(runId: string): Promise<void>;
  rerun?(runId: string): Promise<void>;
  runLocally?(
    runId: string,
    executionId: string,
    runtimeRoot: string,
    signal: AbortSignal,
  ): Promise<ILocalCiExecution>;
}
