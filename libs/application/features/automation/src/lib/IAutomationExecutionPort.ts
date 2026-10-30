// #region Imports

import type { IAgenticDeliveryPolicy, IAgenticDeliveryRecord } from '@symphony/domain-automation';
import type { ICiRunDetails } from '@symphony/domain-ci';
import type { IExecutionRecord } from '@symphony/domain-execution';
import type { IWorkItem } from '@symphony/domain-work';
import type { IAutomationExecutionTrigger } from './IAutomationExecutionTrigger';

// #endregion

/**
 * Admits analysis, implementation and agentic-delivery attempts through the execution owner.
 *
 * @public
 */
export interface IAutomationExecutionPort {
  startForWorkItem(
    workItem: IWorkItem,
    request?: string,
    trigger?: IAutomationExecutionTrigger,
  ): Promise<IExecutionRecord>;
  startSolutionForWorkItem(
    workItem: IWorkItem,
    feedback?: string,
    trigger?: IAutomationExecutionTrigger,
  ): Promise<IExecutionRecord>;
  startAgenticDeliveryDiagnosis?(
    workItem: IWorkItem,
    sourceExecution: IExecutionRecord,
    delivery: IAgenticDeliveryRecord,
    evidence: ICiRunDetails,
    policy: IAgenticDeliveryPolicy,
  ): Promise<IExecutionRecord>;
  startAgenticDeliveryRepair?(
    workItem: IWorkItem,
    sourceExecution: IExecutionRecord,
    diagnosis: IExecutionRecord,
    delivery: IAgenticDeliveryRecord,
    evidence: ICiRunDetails,
    policy: IAgenticDeliveryPolicy,
  ): Promise<IExecutionRecord>;
}
