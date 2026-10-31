// #region Imports
import type { Routes } from '@angular/router';
// #endregion

/**
 * Wraps the selected feature pages in the main window and derives every fallback from an included
 * concrete route. Windows of their own, such as Settings, are top-level routes beside `main`.
 *
 * @param children - Feature pages of the main window; the first concrete one is the start page.
 * @param windows - Top-level routes of the application's other windows.
 * @public
 */
export const presentationRoutes = (children: Routes, windows: Routes = []): Routes => {
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
    ...windows,
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
