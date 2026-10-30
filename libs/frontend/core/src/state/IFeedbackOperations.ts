// #region Imports

import type { Signal } from '@angular/core';
import type { RequestPayload } from '@symphony/ipc-contracts-composition';

// #endregion

/** Feedback operations consumed without importing their feature implementation. @public */
export interface IFeedbackOperations {
  /** The single feature-owned connection-test lifecycle. @public @readonly */
  readonly feedbackIntakeTestBusy: Signal<boolean>;
  /** Tests the configured channel through the validated desktop boundary. @public */
  testFeedbackIntake(source: RequestPayload<'feedback-intake.test'>['source']): Promise<boolean>;
}
