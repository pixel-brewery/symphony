// #region Imports

import { inject } from '@angular/core';
import { Router, type CanMatchFn, type Routes } from '@angular/router';
import { ApplicationBootstrap } from '@symphony/frontend-core/bootstrap';
import { ConfigurationStore } from '@symphony/frontend-core/configuration';

// #endregion

const canMatchArcade: CanMatchFn = async () => {
  const bootstrap = inject(ApplicationBootstrap);
  const settings = inject(ConfigurationStore).settings;
  const router = inject(Router);
  await bootstrap.initialize();
  return settings()?.user.arcadeEnabled === true ? true : router.createUrlTree(['/main/home']);
};

export const arcadeRoutes: Routes = [
  {
    path: 'arcade',
    canMatch: [canMatchArcade],
    children: [
      {
        path: '',
        pathMatch: 'full',
        loadComponent: () => import('../views/ArcadeView').then((module) => module.ArcadeView),
      },
      {
        path: 'pitfall',
        loadComponent: () =>
          import('../games/pitfall/views/PitfallView').then((module) => module.PitfallView),
      },
      {
        path: 'pitfall-ii',
        loadComponent: () =>
          import('../games/pitfall-ii/views/PitfallIIView').then((module) => module.PitfallIIView),
      },
      {
        path: 'breakout',
        loadComponent: () =>
          import('../games/breakout/views/BreakoutView').then((module) => module.BreakoutView),
      },
      {
        path: 'realsports-boxing',
        loadComponent: () =>
          import('../games/realsports-boxing/views/RealsportsBoxingView').then(
            (module) => module.RealsportsBoxingView,
          ),
      },
      {
        path: 'jungle-hunt',
        loadComponent: () =>
          import('../games/jungle-hunt/views/JungleHuntView').then(
            (module) => module.JungleHuntView,
          ),
      },
      {
        path: 'pong',
        loadComponent: () =>
          import('../games/pong/views/PongView').then((module) => module.PongView),
      },
      {
        path: 'seaquest',
        loadComponent: () =>
          import('../games/seaquest/views/SeaquestView').then((module) => module.SeaquestView),
      },
      {
        path: 'river-raid',
        loadComponent: () =>
          import('../games/river-raid/views/RiverRaidView').then((module) => module.RiverRaidView),
      },
    ],
  },
];
