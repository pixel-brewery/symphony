// #region Imports

import type { ExecutionState } from '@symphony/domain-execution';
import type { IAnalyzerDependencies } from '../analyzer/IAnalyzerDependencies';

// #endregion

/** Capabilities consumed by ExecutionWorkspaceService. @public */
export interface IExecutionWorkspacesDependencies {
  readonly repository: Pick<NonNullable<IAnalyzerDependencies['repository']>, 'listExecutions'>;
  readonly workspace: Pick<
    NonNullable<IAnalyzerDependencies['workspace']>,
    'listManaged' | 'release' | 'preserve' | 'isAvailable'
  >;
  readonly retainFailedWorkspaces: IAnalyzerDependencies['retainFailedWorkspaces'];
  isActive(state: ExecutionState): boolean;
}
