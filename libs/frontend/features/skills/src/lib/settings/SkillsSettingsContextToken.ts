// #region Imports
import { InjectionToken } from '@angular/core';
import type { ISkillsSettingsContext } from './ISkillsSettingsContext';
// #endregion
/** Connects the import drawer to the existing configuration operation lifecycle. @public */
export const SKILLS_SETTINGS_CONTEXT = new InjectionToken<ISkillsSettingsContext>(
  'SKILLS_SETTINGS_CONTEXT',
);
