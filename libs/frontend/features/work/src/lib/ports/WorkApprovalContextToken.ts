// #region Imports

import { InjectionToken } from '@angular/core';
import type { IWorkApprovalContext } from './IWorkApprovalContext';

// #endregion

/** Connects this Work consumer to its actual bounded participant. @public */
export const WORK_APPROVAL_CONTEXT = new InjectionToken<IWorkApprovalContext>(
  'WORK_APPROVAL_CONTEXT',
);
