// #region Imports

import type { ApplicationSettingsDto } from '@symphony/ipc-contracts-composition';

// #endregion

/**
 * Confirmed workspace glyph and its existing workspace color.
 *
 * @public
 */
export interface IWorkspaceAvatarSelection {
  avatar: NonNullable<ApplicationSettingsDto['workspaces'][number]['avatar']>;
  color: string;
}
