// #region Imports

import { inject } from '@angular/core';
import { ApplicationBootstrap } from '@symphony/frontend-core/bootstrap';
import { ConfigurationStore } from '@symphony/frontend-core/configuration';
import { EXECUTION_OPERATIONS } from '@symphony/frontend-core/execution';
import { ApplicationProjection } from '@symphony/frontend-core/projection';
import { REPOSITORY_RUNTIME_OPERATIONS } from '@symphony/frontend-core/workspace';
import { WORK_REFRESH } from '../../ports/WorkRefreshToken';
import type { IWorkOnboardingContext } from '../ports/IWorkOnboardingContext';

// #endregion

/**
 * Composes the onboarding consumer from existing owners without another facade or writable state.
 *
 * @returns The current product's available onboarding capabilities.
 * @public
 */
export function createWorkOnboardingContext(): IWorkOnboardingContext {
  const projection = inject(ApplicationProjection);
  const configuration = inject(ConfigurationStore);
  const bootstrap = inject(ApplicationBootstrap);
  const refresh = inject(WORK_REFRESH);
  const repositories = inject(REPOSITORY_RUNTIME_OPERATIONS, { optional: true });
  const execution = inject(EXECUTION_OPERATIONS, { optional: true });
  return {
    settings: configuration.settings,
    selectedWorkspaceIds: projection.selectedWorkspaceIds,
    scopedWorkItems: projection.scopedWorkItems,
    snapshot: projection.snapshot,
    initialize: () => bootstrap.initialize(),
    saveSettings: (settings, successMessage) =>
      configuration.saveSettings(settings, successMessage),
    refresh: () => refresh.refresh(),
    ...(repositories
      ? { prepareRepository: (id: string) => repositories.prepareRepository(id) }
      : {}),
    ...(execution
      ? {
          startAnalyzer: (
            simulateFailure: boolean,
            workItemId?: string,
            prompt?: string,
            executionApproval?: 'once' | 'repository',
          ) => execution.startAnalyzer(simulateFailure, workItemId, prompt, executionApproval),
        }
      : {}),
  };
}
