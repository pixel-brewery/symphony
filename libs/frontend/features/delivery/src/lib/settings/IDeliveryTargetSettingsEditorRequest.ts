// #region Imports

import type { ISettingsEditorRequest } from '@symphony/frontend-setting';

// #endregion

/** The unchanged existing delivery destination editor request. @public */
export interface IDeliveryTargetSettingsEditorRequest extends ISettingsEditorRequest {
  readonly kind: 'delivery-target';
  readonly workspaceId: string;
  readonly repositoryBindingId: string;
  readonly targetId?: string;
  readonly production?: boolean;
  readonly environment?: string;
  readonly displayName?: string;
  readonly targetKind?: 'environment' | 'release-channel' | 'installation';
}
