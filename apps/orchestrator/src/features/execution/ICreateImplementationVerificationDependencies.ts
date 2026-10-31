// #region Imports
import {
  type ManifestVerificationPlanner,
  type LocalVerificationExecutor,
} from '@symphony/providers-ci';
import { type OrchestratorSettingsState } from '../../composition/OrchestratorSettingsState';
// #endregion
/**
 * Consumes the workspace selection and deterministic verification adapters.
 *
 * @public
 */
export interface ICreateImplementationVerificationDependencies {
  readonly settingsState: Readonly<Pick<OrchestratorSettingsState, 'current'>>;
  readonly configurationRoot: string;
  readonly implementationVerificationPlanner: Pick<ManifestVerificationPlanner, 'plan'>;
  readonly implementationVerificationExecutor: Pick<LocalVerificationExecutor, 'execute'>;
}
