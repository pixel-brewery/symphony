// #region Imports

import type { IAnalyzerDependencies } from '../analyzer/IAnalyzerDependencies';

// #endregion

/** Capabilities consumed by ExecutionEventService. @public */
export interface IExecutionEventsDependencies {
  readonly ids: Pick<NonNullable<IAnalyzerDependencies['ids']>, 'next'>;
  readonly clock: Pick<NonNullable<IAnalyzerDependencies['clock']>, 'now'>;
  readonly repository: Pick<
    NonNullable<IAnalyzerDependencies['repository']>,
    'listEvents' | 'saveEvent'
  >;
  readonly publish: IAnalyzerDependencies['publish'];
}
