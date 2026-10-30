// #region Imports
import { InjectionToken } from '@angular/core';
import type { ISkillImportPaths } from './ISkillImportPaths';
// #endregion
/** Connects Skill import to the sandboxed path-selection bridge. @public */
export const SKILL_IMPORT_PATHS = new InjectionToken<ISkillImportPaths>('SKILL_IMPORT_PATHS');
