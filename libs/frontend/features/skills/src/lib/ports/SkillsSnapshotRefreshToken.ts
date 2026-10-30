// #region Imports

import { InjectionToken } from '@angular/core';
import type { ISkillsSnapshotRefresh } from './ISkillsSnapshotRefresh';

// #endregion

/**
 * Resolves the authoritative snapshot refresh command for Skills.
 *
 * @public
 */
export const SKILLS_SNAPSHOT_REFRESH = new InjectionToken<ISkillsSnapshotRefresh>(
  'SKILLS_SNAPSHOT_REFRESH',
);
