// #region Imports

import type { ISkillPackageFile } from './ISkillPackageFile';

// #endregion

export interface IEditableSkillPackage {
  originalName?: string;
  name: string;
  description: string;
  instructions: string;
  openaiYaml: string;
  files: readonly ISkillPackageFile[];
}
