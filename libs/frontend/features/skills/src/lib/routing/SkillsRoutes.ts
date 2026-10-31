// #region Imports

import type { Routes } from '@angular/router';

// #endregion

export const skillsRoutes: Routes = [
  {
    path: 'skills',
    loadComponent: () => import('../views/SkillsView').then((module) => module.SkillsView),
  },
];
