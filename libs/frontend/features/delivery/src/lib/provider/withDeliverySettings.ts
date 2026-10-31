// #region Imports

import type { IFeature } from '@symphony/frontend-core';
import {
  SettingsViewSlot,
  withSettingsEditor,
  withSettingsRouteInitializer,
  withSettingsViews,
  type SettingsFeatureKind,
} from '@symphony/frontend-setting';
import { isRepositorySettingsEditorRequest } from '../settings/isRepositorySettingsEditorRequest';
import { isDeliveryTargetSettingsEditorRequest } from '../settings/isDeliveryTargetSettingsEditorRequest';
import { initializeDeliverySettingsRoute } from '../settings/initializeDeliverySettingsRoute';

// #endregion

/** Contributes the existing repository and destination cards, drawers and route effect. @public */
export function withDeliverySettings(): readonly IFeature<SettingsFeatureKind>[] {
  return [
    withSettingsViews({
      id: 'delivery-workspace-settings',
      slot: SettingsViewSlot.Workspace,
      views: [
        {
          id: 'delivery-workspace-repositories',
          order: 10,
          section: {
            scope: 'workspace',
            id: 'repositories',
            label: 'Repositories',
            description: 'Local source code and AI work approval.',
            order: 30,
          },
          canActivate: (selection) =>
            selection?.sectionId === 'repositories' && !!selection.workspaceId,
          loadComponent: () =>
            import('../settings/DeliverySettingsCardView').then(
              (module) => module.DeliverySettingsCardView,
            ),
        },
        {
          id: 'delivery-workspace-destinations',
          order: 10,
          section: {
            scope: 'workspace',
            id: 'delivery',
            label: 'Delivery destinations',
            description: 'Production, environments, release channels, and deployment workflows.',
            order: 40,
          },
          canActivate: (selection) =>
            selection?.sectionId === 'delivery' && !!selection.workspaceId,
          loadComponent: () =>
            import('../settings/DeliverySettingsCardView').then(
              (module) => module.DeliverySettingsCardView,
            ),
        },
      ],
    }),
    withSettingsEditor({
      id: 'delivery-repository-editor',
      kind: 'repository',
      isRequest: isRepositorySettingsEditorRequest,
      loadComponent: () =>
        import('../settings/DeliverySettingsEditorView').then(
          (module) => module.DeliverySettingsEditorView,
        ),
    }),
    withSettingsEditor({
      id: 'delivery-target-editor',
      kind: 'delivery-target',
      isRequest: isDeliveryTargetSettingsEditorRequest,
      loadComponent: () =>
        import('../settings/DeliverySettingsEditorView').then(
          (module) => module.DeliverySettingsEditorView,
        ),
    }),
    withSettingsRouteInitializer({
      id: 'delivery-settings-route',
      initialize: initializeDeliverySettingsRoute,
    }),
  ];
}
