// #region Imports

import type { IContinuousIntegrationPort } from '@symphony/application-ci';
import type { IPlatformClock } from '@symphony/application-core';
import type { IWorkflowReporter } from '@symphony/application-workflow';
import type { IAgenticDeliveryPolicy } from '@symphony/domain-automation';
import type { IWorkItem } from '@symphony/domain-work';
import type { IWorkflowDefinition, IWorkflowRecord } from '@symphony/domain-workflow';
import type { IAutomationDeliveryPort } from './IAutomationDeliveryPort';
import type { IAutomationExecutionPort } from './IAutomationExecutionPort';
import type { IAutomationExecutionRepository } from './IAutomationExecutionRepository';
import type { IAutomationRepository } from './IAutomationRepository';
import type { IAutomationTrackingPort } from './IAutomationTrackingPort';

// #endregion

/**
 * Supplies the consumed observations, execution admission and durable automation policy.
 *
 * @public
 */
export interface IAutomationServiceDependencies {
  tracker: IAutomationTrackingPort;
  /** Configured delivery process; decides which stage runs which role. */
  workflow: () => IWorkflowDefinition;
  /**
   * Supervisor that routes verification outcomes into stage changes. Synchronization reports
   * facts; it never moves a work item on the tracker itself.
   */
  workflowReporter?: Pick<IWorkflowReporter, 'applyRunResult'>;
  /**
   * Workflow record of one item. Autonomy leaves held work alone: a scheduled retry belongs
   * to the workflow scheduler, and blocked, human-required, and quarantined items wait for
   * their condition or a person, never for the next cycle.
   */
  workflowRecord?: (workItemId: string) => IWorkflowRecord | undefined;
  listWorkItems?: () => Promise<readonly IWorkItem[]>;
  executions: IAutomationExecutionPort;
  repository: IAutomationRepository;
  executionRepository: IAutomationExecutionRepository;
  clock: IPlatformClock;
  enabled: () => boolean;
  autonomyEnabled?: () => boolean;
  maxParallelExecutions?: () => number;
  agenticDeliveryPolicy?: () => IAgenticDeliveryPolicy;
  agenticDeliveryEnabledFor?: (workspaceId: string, repositoryBindingId: string) => boolean;
  /** Refuses low-priority work before it consumes capacity reserved for delivery and builds. */
  storageAdmission?: (
    workItem: IWorkItem,
    workload: 'analysis' | 'implementation',
  ) => void | Promise<void>;
  /**
   * Steps an operator already accepted that are waiting for a slot. Autonomy runs behind them:
   * it may only use the capacity the queue leaves, otherwise a ticket someone deliberately
   * queued would keep losing its slot to whatever the board offers next.
   */
  executionQueue?: {
    readonly pending: () => number;
    readonly drain: () => Promise<number>;
  };
  ci?: IContinuousIntegrationPort;
  delivery?: IAutomationDeliveryPort;
}
