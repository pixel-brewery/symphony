// #region Imports

import type { Routes } from '@angular/router';
import { mobileWorkRoutes } from '@symphony/frontend-feature-work/mobile';
import { mobileDeliveryRoutes } from '@symphony/frontend-feature-delivery/mobile';
import {
  MobilePresenterView,
  mobilePresentationRoutes,
} from '@symphony/frontend-presentation/mobile';

// #endregion

export const appRoutes: Routes = [
  {
    path: '',
    component: MobilePresenterView,
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'home' },
      ...mobileWorkRoutes,
      ...mobileDeliveryRoutes,
      ...mobilePresentationRoutes,
      { path: '**', redirectTo: 'home' },
    ],
  },
];
