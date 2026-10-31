// #region Imports

import type { ApplicationSettingsDto } from '@symphony/ipc-contracts-composition';

// #endregion

/** Structured workspace identity needed by every compact avatar. @public */
export type WorkspaceAvatarSource = Pick<
  ApplicationSettingsDto['workspaces'][number],
  'shortCode' | 'color' | 'avatar'
>;
