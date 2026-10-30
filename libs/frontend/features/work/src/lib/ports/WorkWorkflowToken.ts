// #region Imports

import { InjectionToken } from '@angular/core';
import type { IWorkflowOperations } from '@symphony/frontend-core/workflow';

// #endregion

/** Supplies Work's separately owned workflow actions and busy state. @public */
export const WORK_WORKFLOW = new InjectionToken<IWorkflowOperations>('WORK_WORKFLOW');
