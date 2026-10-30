// #region Imports

import { InjectionToken } from '@angular/core';
import type { ISkillsAssignments } from './ISkillsAssignments';

// #endregion

/**
 * Resolves configuration-backed Skills assignment commands.
 *
 * @public
 */
export const SKILLS_ASSIGNMENTS = new InjectionToken<ISkillsAssignments>('SKILLS_ASSIGNMENTS');
