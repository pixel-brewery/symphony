// #region Imports

import type { IFeature } from '@symphony/frontend-core';
import {
  SettingsViewSlot,
  withSettingsEditor,
  withSettingsEditorRoute,
  withSettingsRouteInitializer,
  withSettingsViews,
  type SettingsFeatureKind,
} from '@symphony/frontend-setting';
import { deliveryTargetSearchEntries } from '../settings/deliveryTargetSearchEntries';
import { isRepositorySettingsEditorRequest } from '../settings/isRepositorySettingsEditorRequest';
import { isDeliveryTargetSettingsEditorRequest } from '../settings/isDeliveryTargetSettingsEditorRequest';
import { initializeDeliverySettingsRoute } from '../settings/initializeDeliverySettingsRoute';
import { repositorySearchEntries } from '../settings/repositorySearchEntries';
import { resolveRepositoryEditorRoute } from '../settings/resolveRepositoryEditorRoute';

// #endregion

/**
 * Contributes the repository and destination cards with one `Search settings` entry per repository
 * and destination, their sheets and the routes that open them (`?repository=` in Repositories,
 * `?repository=&target=` in Delivery destinations). @public
 */
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
          search: [
            {
              id: 'repositories',
              label: 'Repositories',
              description:
                'Add every source-code repository used by this workspace. Configured repositories are available to AI tasks.',
              keywords: [
                'Add repository',
                'Prepare locally',
                'GitHub',
                'checkout',
                'remove repository',
              ],
            },
          ],
          searchEntries: repositorySearchEntries,
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
          search: [
            {
              id: 'delivery-destinations',
              label: 'Delivery destinations',
              description:
                'Choose which environments, release channels and installations appear in the orbit. Mark the destination that represents Production. A version is confirmed only by delivery evidence.',
              keywords: [
                'Add destination',
                'Production',
                'environment',
                'release channel',
                'installation',
                'orbit',
                'deployment workflow',
              ],
            },
          ],
          searchEntries: deliveryTargetSearchEntries,
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
      width: '600px',
      isRequest: isRepositorySettingsEditorRequest,
      loadComponent: () =>
        import('../settings/DeliverySettingsEditorView').then(
          (module) => module.DeliverySettingsEditorView,
        ),
    }),
    withSettingsEditor({
      id: 'delivery-target-editor',
      kind: 'delivery-target',
      width: '640px',
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
    withSettingsEditorRoute({
      id: 'delivery-repository-route',
      section: 'repositories',
      parameter: 'repository',
      resolve: resolveRepositoryEditorRoute,
    }),
  ];
}
