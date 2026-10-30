// #region Imports
import { type SkillCatalogService } from '@symphony/application-skills';
import { type OrchestratorSettingsState } from '../../composition/OrchestratorSettingsState';
// #endregion

/**
 * Consumes only the capabilities required by skills orchestration.
 *
 * @public
 */
export interface IProvideSkillsOrchestratorFeatureDependencies {
  readonly skillPackages: Pick<
    SkillCatalogService,
    'builtins' | 'customizeBuiltin' | 'list' | 'get' | 'save' | 'import' | 'export' | 'delete'
  >;
  readonly settingsState: Readonly<Pick<OrchestratorSettingsState, 'current'>>;
}
