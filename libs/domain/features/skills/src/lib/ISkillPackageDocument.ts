// #region Imports

import type { ISkillPackageFile } from './ISkillPackageFile';
import type { ISkillPackageSummary } from './ISkillPackageSummary';

// #endregion

export interface ISkillPackageDocument extends ISkillPackageSummary {
  instructions: string;
  openaiYaml: string;
  files: readonly ISkillPackageFile[];
}
