// #region Imports

import { type ExecutionAdmission } from '@symphony/application-execution';
import { type MobileAccessService } from '@symphony/application-mobile';
import { type IAgentProfile } from '@symphony/domain-team';
import { type IExecutionQueueEntry, type IExecutionRecord } from '@symphony/domain-execution';
import {
  type IIssueDraft,
  type IIssueDraftRequest,
  type IWorkItem,
  type IWorkItemEditorMetadata,
} from '@symphony/domain-work';
import { type IOrchestrationSnapshot } from '@symphony/ipc-contracts-composition';
import { type MobileWorkItemCreateRequest } from '@symphony/mobile-contracts';

// #endregion

export interface ILocalMobileGatewayDependencies {
  readonly access: Pick<
    MobileAccessService,
    | 'authorize'
    | 'isEnabled'
    | 'pairingStatus'
    | 'proposePairing'
    | 'setDeviceConnected'
    | 'setRuntime'
  >;
  readonly assetsPath: string;
  readonly desktopName: string;
  readonly remoteAutomationEnabled: () => boolean;
  readonly employees?: () => readonly IAgentProfile[];
  readonly snapshot: () => Promise<IOrchestrationSnapshot>;
  readonly workItemCreationContext: (repository?: string) => Promise<{
    readonly workspaceId: string;
    readonly workspaceName: string;
    readonly metadata: IWorkItemEditorMetadata;
  }>;
  readonly createWorkItem: (input: MobileWorkItemCreateRequest) => Promise<IWorkItem>;
  readonly draftIssue: (input: IIssueDraftRequest) => Promise<IIssueDraft>;
  readonly cancelIssueDraft: (operationId: string) => boolean;
  readonly startAnalyzer: (workItemId: string, prompt?: string) => Promise<ExecutionAdmission>;
  readonly startSolver: (workItemId: string, feedback?: string) => Promise<ExecutionAdmission>;
  readonly cancelExecution: (executionId: string) => Promise<IExecutionRecord>;
  readonly removeQueueEntry: (entryId: string) => IExecutionQueueEntry;
  readonly publishPullRequest: (executionId: string) => Promise<IExecutionRecord>;
  readonly moveWorkItem: (workItemId: string, boardColumnId: string) => Promise<IWorkItem>;
  readonly decideWorkflow: (workItemId: string, optionId: string) => Promise<void>;
  readonly reportRequestFailure?: (failure: {
    readonly method: string;
    readonly pathname: string;
    readonly status: number;
    readonly code: string;
    readonly error: string;
    readonly validationIssues?: readonly {
      readonly code: string;
      readonly path: string;
    }[];
  }) => void;
  readonly host?: string;
  readonly portStart?: number;
  readonly portEnd?: number;
  readonly now?: () => Date;
}
