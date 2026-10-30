// #region Imports

import type { IExecutionRecord } from '@symphony/domain-execution';
import type { IAgenticDeliveryPolicy, IAgenticDeliveryRecord } from '@symphony/domain-automation';
import type { ICiRunDetails } from '@symphony/domain-ci';
import type { IWorkItem } from '@symphony/domain-work';
import type { IExecutionTrigger as IAutomationExecutionTrigger } from '../ports/IExecutionTrigger';

// #endregion

/** Commands exposed by the single starting owner. @public */
export interface IExecutionStarts {
  startAgenticDeliveryDiagnosis(
    workItem: IWorkItem,
    sourceExecution: IExecutionRecord,
    delivery: IAgenticDeliveryRecord,
    evidence: ICiRunDetails,
    policy: IAgenticDeliveryPolicy,
  ): Promise<IExecutionRecord>;
  startAgenticDeliveryRepair(
    workItem: IWorkItem,
    sourceExecution: IExecutionRecord,
    diagnosis: IExecutionRecord,
    delivery: IAgenticDeliveryRecord,
    evidence: ICiRunDetails,
    policy: IAgenticDeliveryPolicy,
  ): Promise<IExecutionRecord>;
  startAnalysis(
    simulateFailure: boolean,
    workItemId?: string,
    request?: string,
    automationTrigger?: IAutomationExecutionTrigger,
    executionApproval?: 'once' | 'repository',
  ): Promise<IExecutionRecord>;
  startSolver(
    simulateFailure: boolean,
    workItemId: string,
    feedback?: string,
    automationTrigger?: IAutomationExecutionTrigger,
    executionApproval?: 'once' | 'repository',
  ): Promise<IExecutionRecord>;
}
