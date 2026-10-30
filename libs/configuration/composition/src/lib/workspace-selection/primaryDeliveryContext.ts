// #region Imports

import type { IApplicationSettings } from '../IApplicationSettings';
import type { IDeliveryContext } from '@symphony/domain-workspace';
import { primaryWorkspace } from './primaryWorkspace';

// #endregion

export function primaryDeliveryContext(
  settings: IApplicationSettings,
  workspaceId?: string,
): IDeliveryContext | undefined {
  const targetWorkspaceId = workspaceId ?? primaryWorkspace(settings)?.id;
  return settings.deliveryContexts.find(
    (context) => context.enabled && context.workspaceId === targetWorkspaceId,
  );
}
