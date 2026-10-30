// #region Imports

import type { SkillTextDigest } from '@symphony/domain-skills';
import type { IExecutionEvent } from '@symphony/domain-execution';
import type { IAnalyzerDependencies } from '../analyzer/IAnalyzerDependencies';

// #endregion

/** Capabilities consumed by ExecutionWorkflowService. @public */
export interface IExecutionWorkflowDependencies {
  readonly skillTextDigest: SkillTextDigest;
  readonly workflowReporter?: Pick<
    NonNullable<IAnalyzerDependencies['workflowReporter']>,
    'runStarted' | 'applyRunResult' | 'applyClaim'
  >;
  readonly clock: Pick<NonNullable<IAnalyzerDependencies['clock']>, 'now'>;
  readonly catalog: Pick<NonNullable<IAnalyzerDependencies['catalog']>, 'workflow'>;
  readonly remoteProjectionQueries: Pick<
    NonNullable<IAnalyzerDependencies['remoteProjectionQueries']>,
    'recordWorkItem'
  >;
  readonly tracker: Pick<NonNullable<IAnalyzerDependencies['tracker']>, 'transition'>;
  record(
    executionId: string,
    kind: IExecutionEvent['kind'],
    message: string,
    stream?: Pick<IExecutionEvent, 'origin' | 'category' | 'actor'>,
  ): Promise<void>;
}
