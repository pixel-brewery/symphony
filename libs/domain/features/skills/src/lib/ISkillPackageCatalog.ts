// #region Imports

import type { ISkillPackageSummary } from './ISkillPackageSummary';

// #endregion

export interface ISkillPackageCatalog {
  sharedRoot: string;
  repositoryRoot?: string;
  packages: readonly ISkillPackageSummary[];
}
