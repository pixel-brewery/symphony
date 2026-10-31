// #region Imports

import { InjectionToken } from '@angular/core';
import type { IWorkflowRefresh } from './IWorkflowRefresh';

// #endregion

/** Supplies Workflow's consumed refresh capability. @public */
export const WORKFLOW_REFRESH = new InjectionToken<IWorkflowRefresh>('WORKFLOW_REFRESH');
