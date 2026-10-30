// #region Imports

import type { ISettingsEditorRequest } from '@symphony/frontend-setting';

// #endregion

/** Validated request owned by this feature's workspace settings editor. @public */
export interface ITeamSettingsEditorRequest extends ISettingsEditorRequest {
  /** Existing editor kind used by bookmarkable actions. @public @readonly */
  readonly kind: 'ai';
  /** Explicit workspace scope for all configuration changes. @public @readonly */
  readonly workspaceId: string;
  readonly agentProfileId?: string;
  readonly connectionId?: string;
}
