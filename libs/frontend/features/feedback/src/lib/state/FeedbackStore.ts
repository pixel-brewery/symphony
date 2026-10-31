// #region Imports

import { Inject, inject, Injectable, signal } from '@angular/core';
import type { IFeedbackOperations } from '@symphony/frontend-core/feedback';
import { NotificationService, operatorErrorMessage } from '@symphony/frontend-notification';
import type { RequestPayload } from '@symphony/ipc-contracts-composition';
import { FEEDBACK_CLIENT } from '../ports/FeedbackClientToken';
import type { IFeedbackClient } from '../ports/IFeedbackClient';

// #endregion

/** Owns connection testing and its sole writable lifecycle state. @public */
@Injectable()
export class FeedbackStore implements IFeedbackOperations {
  // #region Fields

  private readonly _feedbackIntakeTestBusy = signal(false);
  /** Shared connection-test state for the editor and settings exclusion. @public @readonly */
  public readonly feedbackIntakeTestBusy = this._feedbackIntakeTestBusy.asReadonly();

  // #endregion

  // #region Ctor

  /** Connects the existing desktop client and notification owner. @public */
  public constructor(
    @Inject(FEEDBACK_CLIENT) private readonly _client: IFeedbackClient = inject(FEEDBACK_CLIENT),
    @Inject(NotificationService)
    private readonly _notifications: Pick<
      NotificationService,
      'showSuccess' | 'showError'
    > = inject(NotificationService),
  ) {}

  // #endregion

  // #region Methods

  /** Tests the selected source with the original request and failure behavior. @public */
  public async testFeedbackIntake(
    source: RequestPayload<'feedback-intake.test'>['source'],
  ): Promise<boolean> {
    this._feedbackIntakeTestBusy.set(true);
    try {
      const result = await this._client.request('feedback-intake.test', { source });
      this._notifications.showSuccess(result.message);
      return true;
    } catch (cause) {
      this._notifications.showError(
        'Unable to read the configured Microsoft Teams channel.',
        operatorErrorMessage(cause),
      );
      return false;
    } finally {
      this._feedbackIntakeTestBusy.set(false);
    }
  }

  // #endregion
}
