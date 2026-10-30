// #region Imports

import { InjectionToken } from '@angular/core';
import type { IWorkPublicationRead } from './IWorkPublicationRead';

// #endregion

/** Connects this Work consumer to its actual bounded participant. @public */
export const WORK_PUBLICATION_READ = new InjectionToken<IWorkPublicationRead | null>(
  'WORK_PUBLICATION_READ',
);
