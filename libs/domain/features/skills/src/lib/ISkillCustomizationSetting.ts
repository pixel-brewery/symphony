// #region Imports

import type { ProcessRole } from '@symphony/domain-workflow';

// #endregion

/** Installation-owned addition to one built-in process role. */
export interface ISkillCustomizationSetting {
  role: ProcessRole;
  additionalInstructions: string;
}
