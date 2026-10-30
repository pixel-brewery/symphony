// #region Imports
import { type OrchestratorSettingsState } from '../../composition/OrchestratorSettingsState';
import { type AutomationService } from '@symphony/application-automation';
import { type StructuredLogger } from '@symphony/logging';
import { type AnalyzerService } from '@symphony/application-execution';
import { type IStorageWriteAdmission } from '../../storage-governor/IStorageWriteAdmission';
// #endregion

/**
 * Consumes only the capabilities required by automation orchestration.
 *
 * @public
 */
export interface IProvideAutomationOrchestratorFeatureDependencies {
  readonly settingsState: Pick<OrchestratorSettingsState, 'current' | 'save'>;
  readonly automation: Pick<AutomationService, 'synchronize' | 'runAutonomousCycle'>;
  readonly logger: Pick<StructuredLogger, 'info' | 'error'>;
  readonly service: Pick<AnalyzerService, 'executionCapacity'>;
  readonly storageGovernor: IStorageWriteAdmission;
}
