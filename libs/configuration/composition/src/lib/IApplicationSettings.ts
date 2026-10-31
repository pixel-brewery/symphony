// #region Imports

import type { IDeliveryTarget } from '@symphony/domain-delivery';
import type { IWorkflowDefinition } from '@symphony/domain-workflow';
import type { IAgentProfile, IAgentTeam, IPositionDefinition } from '@symphony/domain-team';
import type { IAgentRoutePolicy, IProviderCapabilityManifest } from '@symphony/domain-ai';
import type { IAgenticDeliveryPolicy } from '@symphony/domain-automation';
import type {
  ICiBinding,
  ILocalCiResourceLimits,
  LocalCiResourcePresetName,
} from '@symphony/domain-ci';
import type {
  IDeliveryContext,
  IRepositoryBinding,
  ISavedWorkspaceView,
  IWorkspaceDefinition,
  IWorkspaceViewScope,
} from '@symphony/domain-workspace';
import type { IFeedbackIntakeSource } from '@symphony/domain-feedback';
import type { ISkillCustomizationSetting } from '@symphony/domain-skills';
import type { WorkItemSource } from '@symphony/domain-work';
import type { ProviderConnection } from './ProviderConnection';

// #endregion

export interface IApplicationSettings {
  version: 6;
  /** The delivery process itself, editable per installation. */
  workflow: IWorkflowDefinition;
  /** Installation-owned additions to built-in process roles. */
  skillCustomizations: ISkillCustomizationSetting[];
  activeViewScope: IWorkspaceViewScope;
  workspaces: IWorkspaceDefinition[];
  connections: ProviderConnection[];
  workItemSources: WorkItemSource[];
  repositoryBindings: IRepositoryBinding[];
  ciBindings: ICiBinding[];
  positions: IPositionDefinition[];
  providerManifests: IProviderCapabilityManifest[];
  agentRoutePolicies: IAgentRoutePolicy[];
  agentProfiles: IAgentProfile[];
  agentTeams: IAgentTeam[];
  deliveryContexts: IDeliveryContext[];
  feedbackIntakeSources: IFeedbackIntakeSource[];
  savedViews: ISavedWorkspaceView[];
  user: {
    displayName: string;
    email: string;
    theme: 'light' | 'dark' | 'system';
    arcadeEnabled: boolean;
  };
  /** Host-wide virtual-machine specification every workspace with local runs boots. */
  localCi: {
    resourcePreset: LocalCiResourcePresetName;
    customResources?: ILocalCiResourceLimits;
    storageLimitGiB: number;
    /** Keeps one provisioned virtual machine warm between runs instead of recreating it. */
    reuseVirtualMachine: boolean;
  };
  runtime: {
    workspaceRoot: string;
    managedStorageLimitGiB: number;
    minimumFreeDiskGiB: number;
    boardRefreshIntervalMinutes: number;
    retainFailedWorkspaces: boolean;
    automaticExecutionEnabled: boolean;
    autonomousExecutionEnabled: boolean;
    autonomousWorkIntervalMinutes: number;
    maxParallelExecutions: number;
    /** Repair rounds a solve run may spend on red deterministic checks before it fails. */
    maximumVerificationRepairAttempts: number;
    agenticDelivery: IAgenticDeliveryPolicy;
  };
  deliveryTargets?: IDeliveryTarget[];
}
