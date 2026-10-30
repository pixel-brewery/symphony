// #region Imports

import type { IApplicationSettings } from '@symphony/configuration-composition';
import type { IWorkItemCoordinationPort } from '@symphony/application-work';
import type { IWorkTrackingPort } from '../IWorkTrackingPort';

// #endregion

export interface IWorkTrackerRouterOptions {
  readonly settings: () => IApplicationSettings;
  readonly providers: Readonly<
    Record<
      'azure-devops' | 'github-projects',
      IWorkTrackingPort & Partial<IWorkItemCoordinationPort>
    >
  >;
}
