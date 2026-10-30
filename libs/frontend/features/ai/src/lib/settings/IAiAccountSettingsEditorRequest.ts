// #region Imports

import type { ISettingsEditorRequest } from '@symphony/frontend-setting';
import type { AiRuntimeKind } from '@symphony/frontend-core/ai';

// #endregion

/** Validated request owned by this feature's workspace settings editor. @public */
export interface IAiAccountSettingsEditorRequest extends ISettingsEditorRequest {
  /** Existing editor kind used by bookmarkable actions. @public @readonly */
  readonly kind: 'ai-account';
  /** Explicit workspace scope for all configuration changes. @public @readonly */
  readonly workspaceId: string;
  readonly connectionId?: string;
  readonly runtime?: AiRuntimeKind;
}
