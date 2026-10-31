// #region Imports

import { InjectionToken } from '@angular/core';
import type { IWorkflowClient } from './IWorkflowClient';

// #endregion

/** Supplies Workflow's consumed client capability. @public */
export const WORKFLOW_CLIENT = new InjectionToken<IWorkflowClient>('WORKFLOW_CLIENT');
