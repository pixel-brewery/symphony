// #region Imports

import type { IPlatformClock } from '@symphony/application-core';
import type { IAgentRuntimePort } from '../ports/IAgentRuntimePort';
import type { IExecutionCatalog } from '../ports/IExecutionCatalog';
import type { IWorkItem } from '@symphony/domain-work';

// #endregion

/**
 * Supplies only the analysis and catalog reads consumed by relation assessment.
 *
 * @public
 */
export interface IWorkItemRelationAssessorOptions {
  /** Route-governed agent runtime that executes the read-only assessment run. */
  agent: Pick<IAgentRuntimePort, 'analyze'>;
  /** Catalog that resolves the workspace's Analyzer skill and workflow. */
  catalog: Pick<IExecutionCatalog, 'analysisSkill' | 'workflow'>;
  /** Local repository checkout the assessment reads; no isolated worktree is prepared. */
  workingDirectory: (workItem: IWorkItem) => string | undefined;
  clock: IPlatformClock;
  /** Receives every swallowed failure so the composition root can log it. */
  reportFailure?: (cause: unknown) => void;
}
