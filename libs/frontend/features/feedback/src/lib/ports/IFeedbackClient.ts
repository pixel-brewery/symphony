// #region Imports

import type { RequestPayload, ResponsePayload } from '@symphony/ipc-contracts-composition';

// #endregion

/** The one validated desktop method consumed by Feedback. @public */
export interface IFeedbackClient {
  /** Reads the selected channel without storing literal credentials. @public */
  request(
    method: 'feedback-intake.test',
    payload: RequestPayload<'feedback-intake.test'>,
  ): Promise<ResponsePayload<'feedback-intake.test'>>;
}
