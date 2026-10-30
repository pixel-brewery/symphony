// #region Imports

import type { ISettingsEditorRequest } from '@symphony/frontend-setting';

// #endregion

/** The complete request understood by Feedback's channel editor. @public */
export interface IFeedbackSettingsEditorRequest extends ISettingsEditorRequest {
  /** The registered Feedback editor kind. @public @readonly */
  readonly kind: 'teams-feedback';
  /** Workspace owning this channel and its target bindings. @public @readonly */
  readonly workspaceId: string;
  /** Existing source when editing; absent when connecting a channel. @public @readonly */
  readonly sourceId?: string;
}
