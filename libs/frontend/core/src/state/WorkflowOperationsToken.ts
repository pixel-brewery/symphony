// #region Imports

import { InjectionToken } from '@angular/core';
import type { IWorkflowOperations } from './IWorkflowOperations';

// #endregion

/** Supplies the feature-owned workflow operations capability. @public */
export const WORKFLOW_OPERATIONS = new InjectionToken<IWorkflowOperations>('WORKFLOW_OPERATIONS');
