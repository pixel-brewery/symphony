// #region Imports

import type { ISkillsOperations } from '@symphony/frontend-core';

// #endregion

/** The actual optional participant consumed by Work, without another state owner. @public */
export type IWorkSkillsRead = Pick<ISkillsOperations, 'skillCatalog'>;
