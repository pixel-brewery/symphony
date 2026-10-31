// #region Imports

import type { Signal } from '@angular/core';
import type { ResponsePayload } from '@symphony/ipc-contracts-composition';

// #endregion

/**
 * Repository preparation and verification consumed by Work and configuration composition.
 *
 * @public
 */
export interface IRepositoryRuntimeOperations {
  readonly repositoryRuntimeBusy: Signal<string | undefined>;
  readonly verificationRunningRepositoryId: Signal<string | undefined>;
  readonly repositoryRuntimeStatuses: Signal<ResponsePayload<'repositories.runtime.list'>>;
  readonly verificationPlan: Signal<ResponsePayload<'verification.plan'> | undefined>;
  readonly verificationRun: Signal<ResponsePayload<'verification.run'> | undefined>;
  repositoryRuntimeStatus(
    repositoryBindingId: string,
  ): ResponsePayload<'repositories.runtime.list'>[number] | undefined;
  applyRepositoryRuntimeStatuses(statuses: ResponsePayload<'repositories.runtime.list'>): void;
  refreshRepositoryRuntime(repositoryBindingId?: string): Promise<boolean>;
  prepareRepository(repositoryBindingId: string): Promise<boolean>;
  planVerification(repositoryBindingId: string): Promise<boolean>;
  runVerification(
    repositoryBindingId: string,
    planId: string,
    approval: 'once' | 'repository' | 'stored',
  ): Promise<boolean>;
  cancelVerification(repositoryBindingId: string): Promise<void>;
}
