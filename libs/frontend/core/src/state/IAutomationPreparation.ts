// #region Imports

import type { ApplicationSettingsDto } from '@symphony/ipc-contracts-composition';

// #endregion

/**
 * Preparation policy consumed after settings and repository reconciliation.
 *
 * @public
 */
export interface IAutomationPreparation {
  unpreparedAutomaticRepositories(
    automaticExecutionEnabled?: boolean,
  ): readonly ApplicationSettingsDto['repositoryBindings'][number][];
  notifyUnpreparedAutomaticExecution(): void;
}
