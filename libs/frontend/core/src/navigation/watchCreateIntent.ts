// #region Imports

import { effect, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';

// #endregion

/** Query parameter a surface outside the owning feature uses to ask for the authoring drawer. */
const CREATE_PARAM = 'create';

/**
 * Raises the view's own authoring surface when another surface asked for it through the route.
 *
 * Home may not reach into the feature that owns a drawer - a feature library imports no other
 * feature library - so its "New" buttons navigate with `?create=true` instead, exactly the way the
 * board's column and attention widgets already hand their narrowing over. The parameter is a
 * one-shot intent, not a state: it is stripped from the URL as soon as it is honoured, so a
 * reload, a bookmark or the back button never re-opens a drawer the operator has closed.
 *
 * Must be called from an injection context, which in practice means a presenter's constructor.
 *
 * @param open - Opens the view's authoring surface.
 * @public
 */
export function watchCreateIntent(open: () => void): void {
  const route = inject(ActivatedRoute);
  const router = inject(Router);
  const queryParamMap = toSignal(route.queryParamMap, {
    initialValue: route.snapshot.queryParamMap,
  });
  effect(() => {
    if (queryParamMap().get(CREATE_PARAM) !== 'true') return;
    void router.navigate([], {
      relativeTo: route,
      queryParams: { [CREATE_PARAM]: null },
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
    open();
  });
}
