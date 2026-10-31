// #region Imports

import { afterNextRender, effect, inject, Injector, untracked } from '@angular/core';
import { Router } from '@angular/router';
import type { IFeature } from '@symphony/frontend-core';
import type { ISettingsEditorRoute } from '../routing/ISettingsEditorRoute';
import type { ISettingsRouteContext } from '../routing/ISettingsRouteContext';
import type { SettingsFeatureKind } from './SettingsFeatureKind';
import { withSettingsRouteInitializer } from './withSettingsRouteInitializer';

// #endregion

/**
 * Opens a feature-owned editor when the Settings location names one of its items, once per
 * request.
 *
 * The key is removed from the location once the sheet is open (without a new history entry), so
 * the same request again — for example the same `Search settings` result — is a real navigation and
 * opens the sheet again.
 *
 * @param route - The section, the location key and the request resolver.
 * @returns The feature's Settings route initializer.
 * @public
 */
export function withSettingsEditorRoute(
  route: ISettingsEditorRoute,
): IFeature<SettingsFeatureKind> {
  return withSettingsRouteInitializer({
    id: route.id,
    initialize: (context) => initializeSettingsEditorRoute(context, route),
  });
}

/**
 * Connects one editor key to the Settings route's lifetime.
 *
 * @param context - The Settings route's parameters and editor opener.
 * @param route - The section, the location key and the request resolver.
 */
function initializeSettingsEditorRoute(
  context: ISettingsRouteContext,
  route: ISettingsEditorRoute,
): void {
  const resolve = route.resolve();
  const router = inject(Router, { optional: true });
  const injector = inject(Injector);
  let requested = '';
  effect(() => {
    const parameters = context.parameters();
    const value = parameters.get(route.parameter);
    const section =
      parameters.get('section') ?? (route.matchesWithoutSection ? route.section : null);
    if (section !== route.section || !value) {
      requested = '';
      return;
    }
    const workspaceId = parameters.get('workspace') ?? undefined;
    const request = resolve(value, workspaceId);
    if (!request) return;
    const key = `${workspaceId ?? ''}:${value}`;
    if (key === requested) return;
    requested = key;
    untracked(() => {
      // The section the request names renders first; the sheet opens over it afterwards, so its
      // focus trap finds rendered fields.
      afterNextRender(() => context.openEditor(request), { injector });
      if (router) consumeParameter(router, route.parameter);
    });
  });
}

/**
 * Removes one key from the Settings location without a new history entry.
 *
 * @param router - The Settings window's router.
 * @param parameter - The key to remove.
 */
function consumeParameter(router: Router, parameter: string): void {
  const location = router.parseUrl(router.url);
  if (!(parameter in location.queryParams)) return;
  location.queryParams = Object.fromEntries(
    Object.entries(location.queryParams).filter(([name]) => name !== parameter),
  );
  void router.navigateByUrl(location, { replaceUrl: true });
}
