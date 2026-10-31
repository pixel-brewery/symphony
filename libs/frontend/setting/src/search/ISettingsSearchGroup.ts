// #region Imports

import type { ISettingsSearchResult } from './ISettingsSearchResult';

// #endregion

/**
 * The matching settings that share one breadcrumb.
 *
 * @public
 */
export interface ISettingsSearchGroup {
  /**
   * Unique key: the breadcrumb within its workspace.
   *
   * @public
   * @readonly
   */
  readonly key: string;
  /**
   * Breadcrumb parts shared by the results.
   *
   * @public
   * @readonly
   */
  readonly breadcrumb: readonly string[];
  /**
   * The matching settings in index order.
   *
   * @public
   * @readonly
   */
  readonly results: readonly ISettingsSearchResult[];
}
