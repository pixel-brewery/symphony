// #region Imports

import type { Provider } from '@angular/core';

// #endregion

/**
 * A feature's notification registration, composed into the feature's own providers.
 *
 * @public
 */
export interface INotificationContribution {
  /**
   * Stable identifier of the contribution.
   *
   * @public
   * @readonly
   */
  readonly id: string;

  /**
   * Provides the registrations.
   *
   * @returns Providers for the owning feature's environment providers.
   * @public
   */
  provide(): readonly Provider[];
}
