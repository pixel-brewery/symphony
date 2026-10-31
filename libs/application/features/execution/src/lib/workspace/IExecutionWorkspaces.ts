// #region Imports

import type { IExecutionRecord } from '@symphony/domain-execution';
import type { IWorkspaceCleanupResult } from '@symphony/domain-workspace';
import type { IPreparedWorkspace } from '@symphony/application-workspace';

// #endregion

/** Commands exposed by the single workspace owner. @public */
export interface IExecutionWorkspaces {
  clearWorkspaces(): Promise<IWorkspaceCleanupResult>;
  clearWorkspace(workspaceId: string): Promise<IWorkspaceCleanupResult>;
  cleanupEligibleWorkspaces(): Promise<void>;
  cleanupReclaimableAnalysisWorkspaces(): Promise<number>;
  finalizeWorkspace(
    execution: IExecutionRecord,
  ): Promise<'released' | 'preserved' | 'unconfirmed' | 'none'>;
  retainedImplementationWorkspace(executions: readonly IExecutionRecord[]): Promise<
    | {
        execution: IExecutionRecord;
        workspace: IPreparedWorkspace;
      }
    | undefined
  >;
}
