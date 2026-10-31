// #region Imports
import { inject } from '@angular/core';
import type { RedirectFunction, Routes } from '@angular/router';
import { LastScreenMemory } from './LastScreenMemory';
// #endregion

/**
 * Wraps the selected feature pages in the main window and derives every fallback from an included
 * concrete route. Opening the main window without a route reopens the screen it showed last;
 * a remembered screen the composition no longer includes falls back to the start page.
 *
 * @param children - Feature pages of the main window; the first concrete one is the start page.
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
  const startScreen: RedirectFunction = () =>
    inject(LastScreenMemory).read() ?? `/main/${defaultPath}`;
  return [
    {
      path: 'menu-bar',
      loadComponent: () => import('../views/MenuBarView').then((module) => module.MenuBarView),
    },
    {
      path: 'main',
      loadComponent: () => import('../views/PresenterView').then((module) => module.PresenterView),
      children: [
        { path: '', pathMatch: 'full', redirectTo: startScreen },
        ...children,
        { path: '**', redirectTo: defaultPath },
      ],
    },
    { path: '', pathMatch: 'full', redirectTo: startScreen },
    { path: '**', redirectTo: `main/${defaultPath}` },
  ];
};
