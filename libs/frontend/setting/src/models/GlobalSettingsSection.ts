// #region Imports

import type { GlobalSettingsSectionIds } from './GlobalSettingsSectionIds';

// #endregion

/**
 * Identifies a supported global Settings location.
 *
 * @public
 */
export type GlobalSettingsSection = (typeof GlobalSettingsSectionIds)[number];
