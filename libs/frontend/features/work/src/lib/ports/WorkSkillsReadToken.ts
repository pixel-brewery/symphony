// #region Imports

import { InjectionToken } from '@angular/core';
import type { IWorkSkillsRead } from './IWorkSkillsRead';

// #endregion

/** Connects this Work consumer to its actual bounded participant. @public */
export const WORK_SKILLS_READ = new InjectionToken<IWorkSkillsRead | null>('WORK_SKILLS_READ');
