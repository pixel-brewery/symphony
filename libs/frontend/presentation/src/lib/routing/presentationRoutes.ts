// #region Imports
import type { Routes } from '@angular/router';
// #endregion

/**
 * Wraps the selected feature pages and derives every fallback from an included concrete route.
 *
 * @public
 */
export const presentationRoutes = (children: Routes): Routes => {
  const defaultRoute = children.find(
    (route) => route.path && route.path !== '**' && route.redirectTo === undefined,
  );
  if (!defaultRoute?.path) {
    throw new Error('The application composition must include at least one feature page.');
  }
  const defaultPath = defaultRoute.path;
  return [
    {
      path: 'menu-bar',
      loadComponent: () => import('../views/MenuBarView').then((module) => module.MenuBarView),
    },
    {
      path: 'main',
      loadComponent: () => import('../views/PresenterView').then((module) => module.PresenterView),
      children: [
        { path: '', pathMatch: 'full', redirectTo: defaultPath },
        ...children,
        { path: '**', redirectTo: defaultPath },
      ],
    },
    { path: '', pathMatch: 'full', redirectTo: `main/${defaultPath}` },
    { path: '**', redirectTo: `main/${defaultPath}` },
  ];
};
