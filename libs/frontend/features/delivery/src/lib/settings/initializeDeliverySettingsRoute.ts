// #region Imports

import { effect, inject, untracked } from '@angular/core';
import { Router } from '@angular/router';
import type { ISettingsRouteContext } from '@symphony/frontend-setting';
import { DELIVERY_SETTINGS_CONTEXT } from '../ports/DeliverySettingsContextToken';
import { deliverySettingsDraftFor } from './deliverySettingsDraftFor';

// #endregion

/** Route keys that open a destination sheet; the workspace and section stay in the location. */
const EDITOR_PARAMETERS: readonly string[] = [
  'repository',
  'target',
  'production',
  'environment',
  'name',
  'kind',
];

/**
 * Opens the requested project's `Delivery destinations` and, for a destination request, its sheet.
 *
 * The Settings window stays open between requests, so the destination keys are removed from its
 * location once the sheet is open: the same request from the main window (for example `Configure
 * production` on the Orbit) is then a real navigation and opens the sheet again.
 *
 * @param context - The Settings route's parameters, session and editor opener.
 * @public
 */
export function initializeDeliverySettingsRoute(context: ISettingsRouteContext): void {
  const projection = inject(DELIVERY_SETTINGS_CONTEXT),
    draft = deliverySettingsDraftFor(context.session),
    router = inject(Router, { optional: true });
  let requestedEditorKey = '';
  effect(() => {
    const parameters = context.parameters();
    if (parameters.get('section') !== 'delivery') return;
    if (!EDITOR_PARAMETERS.some((name) => parameters.has(name))) {
      requestedEditorKey = '';
      return;
    }
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
      if (router) consumeEditorParameters(router);
    });
  });
}

/**
 * Removes the destination keys from the Settings location without a new history entry.
 *
 * @param router - The Settings window's router.
 */
function consumeEditorParameters(router: Router): void {
  const location = router.parseUrl(router.url);
  if (!EDITOR_PARAMETERS.some((name) => name in location.queryParams)) return;
  location.queryParams = Object.fromEntries(
    Object.entries(location.queryParams).filter(([name]) => !EDITOR_PARAMETERS.includes(name)),
  );
  void router.navigateByUrl(location, { replaceUrl: true });
}
