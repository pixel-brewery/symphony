// #region Imports

import type { IAgentRuntimePort } from '../ports/IAgentRuntimePort';
import type { IExecutionRepository } from '../IExecutionRepository';
import type { IIdGenerator, IPlatformClock } from '@symphony/application-core';
import type { IPullRequestDeliveryPort } from '../ports/IPullRequestDeliveryPort';
import type { IExecutionCatalog as IRuntimeCatalog } from '../ports/IExecutionCatalog';
import type { IWorkflowReporter } from '@symphony/application-workflow';
import type { IWorkItemCoordinationPort } from '@symphony/application-work';
import type { IWorkspacePort } from '@symphony/application-workspace';
import type { IExecutionTrackingPort as TrackerPort } from '../ports/IExecutionTrackingPort';
import type {
  IExecutionBindingSnapshot,
  IExecutionEvent,
  IWorkItemRelationAssessment,
} from '@symphony/domain-execution';
import type { IWorkItem } from '@symphony/domain-work';
import type { SkillFlowRole, SkillTextDigest } from '@symphony/domain-skills';
import type { IRemoteProjectionQueries } from './IRemoteProjectionQueries';
import type { IAgenticDeliveryRecoveryRepository } from '../ports/IAgenticDeliveryRecoveryRepository';

// #endregion

export interface IAnalyzerDependencies {
  readonly skillTextDigest: SkillTextDigest;
  /** Supervisor that routes run results into stage changes. */
  workflowReporter?: IWorkflowReporter;
  tracker: TrackerPort;
  coordination: IWorkItemCoordinationPort;
  workspace: IWorkspacePort;
  agent: IAgentRuntimePort;
  repository: IExecutionRepository;
  agenticDeliveryRecovery: IAgenticDeliveryRecoveryRepository;
  clock: IPlatformClock;
  ids: IIdGenerator;
  catalog: IRuntimeCatalog;
  retainFailedWorkspaces: () => boolean;
  maxParallelExecutions: () => number;
  /** Workspace opt-in for activating fully gated Analyzer proposals without operator approval. */
  automaticDeliveryGroupingEnabledFor?: (workspaceId: string) => boolean;
  /** Refuses to start queued steps while the platform must not take on new work. */
  queueDrainAllowed?: () => boolean;
  publish: (event: IExecutionEvent) => void;
  remoteProjectionQueries: IRemoteProjectionQueries;
  delivery?: IPullRequestDeliveryPort;
  bindingSnapshotFor?: (
    workItem: IWorkItem,
    role: SkillFlowRole,
    agentTeamId?: string,
  ) => IExecutionBindingSnapshot | undefined;
  goalAssignmentFor?: (
    workItem: IWorkItem,
    agentTeamId?: string,
    responsibleAgentId?: string,
  ) => { readonly agentTeamId: string; readonly responsibleAgentId: string } | undefined;
  positionPolicyFor?: (positionId: string) =>
    | {
        readonly allowedPathPatterns: readonly string[];
        readonly forbiddenPathPatterns: readonly string[];
        readonly maximumChangedFiles: number;
        readonly maximumDiffLines: number;
        readonly maximumIterations: number;
      }
    | undefined;
  /** Assigned Analyzer-skill adapter used only for read-only relationship evidence. */
  assessWorkItemRelation?: (
    workItems: readonly IWorkItem[],
    revisions: Readonly<Record<string, number>>,
  ) => Promise<IWorkItemRelationAssessment>;
  verifyImplementation?: (
    workspacePath: string,
    workItem: IWorkItem,
    signal: AbortSignal,
  ) => Promise<
    readonly {
      readonly label: string;
      readonly state: 'passed' | 'failed';
      /** Why the check did not pass, when the reason is more useful than the label alone. */
      readonly detail?: string;
      /**
       * The failing output at the length a repairing agent needs. Operator surfaces read
       * `detail`; only the repair round reads this.
       */
      readonly output?: string;
    }[]
  >;
  /** Repair rounds a solve run may spend on red deterministic checks before it fails. */
  maximumVerificationRepairAttempts?: () => number;
  recoveryDelay?: (attempt: number, signal: AbortSignal, retryAt?: string) => Promise<void>;
  authorizeLocalExecution?: (
    workItem: IWorkItem,
    approval: 'once' | 'repository' | undefined,
  ) => Promise<void>;
}
