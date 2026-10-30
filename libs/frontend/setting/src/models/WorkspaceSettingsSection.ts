// #region Imports

import type { WorkspaceSettingsSectionIds } from './WorkspaceSettingsSectionIds';

// #endregion

/**
 * Identifies a supported workspace Settings location.
 *
 * @public
 */
export type WorkspaceSettingsSection = (typeof WorkspaceSettingsSectionIds)[number];
