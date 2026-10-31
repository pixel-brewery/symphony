// #region Imports

import type { IFeedbackIntakeSignal, IFeedbackIntakeSource } from '@symphony/domain-feedback';
import type { IFeedbackIntakeTestResult } from './IFeedbackIntakeTestResult';

// #endregion

/**
 * Reads collaboration feedback without exposing provider response shapes to application policy.
 *
 * @public
 */
export interface IFeedbackIntakePort {
  listSources(): readonly Pick<IFeedbackIntakeSource, 'id' | 'workspaceId'>[];
  listSignals(): Promise<readonly IFeedbackIntakeSignal[]>;
  testSource(source: IFeedbackIntakeSource): Promise<IFeedbackIntakeTestResult>;
}
