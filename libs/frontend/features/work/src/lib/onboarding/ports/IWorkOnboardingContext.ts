// #region Imports

import type { Signal } from '@angular/core';
import type { IWorkItem } from '@symphony/domain-work';
import type {
  ApplicationSettingsDto,
  IOrchestrationSnapshot,
} from '@symphony/ipc-contracts-composition';

// #endregion

/**
 * Authoritative projections and actual capabilities consumed by Work onboarding.
 *
 * @public
 */
export interface IWorkOnboardingContext {
  readonly settings: Signal<ApplicationSettingsDto | undefined>;
  readonly selectedWorkspaceIds: Signal<readonly string[]>;
  readonly scopedWorkItems: Signal<readonly IWorkItem[]>;
  readonly snapshot: Signal<
    Pick<IOrchestrationSnapshot, 'executions' | 'workflow' | 'executionQueue'> | undefined
  >;
  initialize(): Promise<void>;
  saveSettings(settings: ApplicationSettingsDto, successMessage?: string | false): Promise<boolean>;
  refresh(): Promise<void>;
  prepareRepository?(repositoryBindingId: string): Promise<boolean>;
  startAnalyzer?(
    simulateFailure: boolean,
    workItemId?: string,
    prompt?: string,
    executionApproval?: 'once' | 'repository',
  ): Promise<boolean>;
}
