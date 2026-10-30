// #region Imports

import { InjectionToken } from '@angular/core';
import type { IWorkflowContext } from './IWorkflowContext';

// #endregion

/** Supplies Workflow's consumed context capability. @public */
export const WORKFLOW_CONTEXT = new InjectionToken<IWorkflowContext>('WORKFLOW_CONTEXT');
