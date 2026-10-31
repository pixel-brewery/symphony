// #region Imports

import type { SettingsSection } from '../models/SettingsSection';
import type { ISettingsSearchEntry } from './ISettingsSearchEntry';

// #endregion

/**
 * One searchable setting placed in its section and, for workspace sections, its workspace.
 *
 * @public
 */
export interface ISettingsSearchResult {
  /**
   * Unique key of the result.
   *
   * @public
   * @readonly
   */
  readonly key: string;
  /**
   * The contributed setting.
   *
   * @public
   * @readonly
   */
  readonly entry: ISettingsSearchEntry;
  /**
   * The section the setting lives in.
   *
   * @public
   * @readonly
   */
  readonly section: SettingsSection;
  /**
   * The workspace of a workspace section, otherwise `null`.
   *
   * @public
   * @readonly
   */
  readonly workspaceId: string | null;
  /**
   * Breadcrumb parts: the workspace name for workspace sections, the section label and the group.
   *
   * @public
   * @readonly
   */
  readonly breadcrumb: readonly string[];
}
