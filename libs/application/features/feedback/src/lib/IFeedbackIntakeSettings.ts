// #region Imports

import type { WorkItemSource } from '@symphony/domain-work';
import type { IRepositoryBinding } from '@symphony/domain-workspace';

// #endregion

/**
 * Exposes the configured repositories and Work Item sources consumed by feedback intake.
 *
 * @public
 */
export interface IFeedbackIntakeSettings {
  /**
   * Repository destinations that feedback can select by workspace and binding identifier.
   *
   * @public
   */
  readonly repositoryBindings: readonly IRepositoryBinding[];

  /**
   * Tracker sources that feedback can select by workspace and source identifier.
   *
   * @public
   */
  readonly workItemSources: readonly WorkItemSource[];
}
