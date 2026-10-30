// #region Imports

import type { WorkflowEngineService } from '../engine/WorkflowEngineService';
import type { IWorkflowDefinition } from '@symphony/domain-workflow';
import type { IWorkItem } from '@symphony/domain-work';
import type { IPlatformClock } from '@symphony/application-core';
import type { IWorkflowExecutionPort } from './IWorkflowExecutionPort';

// #endregion

export interface IWorkflowMaintenanceDependencies {
  readonly engine: WorkflowEngineService;
  readonly workflow: () => IWorkflowDefinition;
  readonly clock: IPlatformClock;
  /** Operational items from the local projection; maintenance never queries the provider. */
  readonly listWorkItems: () => Promise<readonly IWorkItem[]>;
  readonly executions: IWorkflowExecutionPort;
  /** Whether an execution slot is free; a held item simply stays held until one is. */
  readonly capacityAvailable: () => boolean;
}
