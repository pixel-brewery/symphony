// #region Imports

import { effect, inject, untracked } from '@angular/core';
import type { ISettingsRouteContext } from '@symphony/frontend-setting';
import { DELIVERY_SETTINGS_CONTEXT } from '../ports/DeliverySettingsContextToken';
import { deliverySettingsDraftFor } from './deliverySettingsDraftFor';

// #endregion

/** Preserves Delivery's existing explicit workspace/deeplink/editor sequencing. @public */
export function initializeDeliverySettingsRoute(context: ISettingsRouteContext): void {
  const projection = inject(DELIVERY_SETTINGS_CONTEXT),
    draft = deliverySettingsDraftFor(context.session);
  let requestedEditorKey = '';
  effect(() => {
    const parameters = context.parameters();
    if (parameters.get('section') !== 'delivery') return;
    const workspace = projection
      .settings()
      ?.workspaces.find((item) => item.id === parameters.get('workspace'));
    if (!workspace) return;
    const repository = projection
      .settings()
      ?.repositoryBindings.find(
        (item) =>
          item.id === parameters.get('repository') &&
          item.workspaceId === parameters.get('workspace'),
      );
    const key = JSON.stringify(
      ['workspace', 'repository', 'target', 'production', 'environment', 'name', 'kind'].map(
        (name) => parameters.get(name),
      ),
    );
    if (key === requestedEditorKey) return;
    requestedEditorKey = key;
    const targetId = parameters.get('target');
    const target = projection
      .settings()
      ?.deliveryTargets.find(
        (item) =>
          item.id === targetId &&
          item.repositoryBindingId === repository?.id &&
          item.workspaceId === workspace.id,
      );
    const kind = parameters.get('kind');
    untracked(() => {
      context.session.openWorkspace(workspace.id, 'delivery');
      draft.deliveryRepositoryId.set(repository?.id ?? '');
      if (repository && (targetId === 'new' || target))
        context.openEditor({
          kind: 'delivery-target',
          workspaceId: repository.workspaceId,
          repositoryBindingId: repository.id,
          targetId: target?.id,
          production: parameters.get('production') === 'true',
          environment: parameters.get('environment') ?? undefined,
          displayName: parameters.get('name') ?? undefined,
          targetKind: kind === 'release-channel' || kind === 'installation' ? kind : 'environment',
        });
    });
  });
}
