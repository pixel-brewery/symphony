// #region Imports

import type { IPlatformClock } from '@symphony/application-core';
import type { WorkItemService } from '@symphony/application-work';
import type { IFeedbackIntakePort } from './IFeedbackIntakePort';
import type { IFeedbackIntakeRepository } from './IFeedbackIntakeRepository';
import type { IFeedbackIntakeSettings } from './IFeedbackIntakeSettings';
import type { IFeedbackIntakeTrackingPort } from './IFeedbackIntakeTrackingPort';

// #endregion

/**
 * Supplies only the context and effects consumed by durable feedback synchronization.
 *
 * @public
 */
export interface IFeedbackIntakeServiceDependencies {
  /**
   * Reads the current repository and Work Item destinations before creating an item.
   *
   * @public
   */
  readonly settings: () => IFeedbackIntakeSettings;

  /**
   * Reads provider-neutral feedback sources and signals.
   *
   * @public
   */
  readonly intake: IFeedbackIntakePort;

  /**
   * Reads existing marked items before creating new ones.
   *
   * @public
   */
  readonly tracker: IFeedbackIntakeTrackingPort;

  /**
   * Reuses the public Work Item drafting and creation lifecycle.
   *
   * @public
   */
  readonly workItems: Pick<WorkItemService, 'draft' | 'create'>;

  /**
   * Persists the existing feedback deduplication and source-baseline evidence.
   *
   * @public
   */
  readonly repository: IFeedbackIntakeRepository;

  /**
   * Supplies timestamps for receipts and checkpoints.
   *
   * @public
   */
  readonly clock: IPlatformClock;
}
