// #region Imports

import type { IWorkspaceScope } from '@symphony/frontend-core/workspace';

// #endregion

/** The actual optional participant consumed by Work, without another state owner. @public */
export type IWorkBoardSelection = Pick<IWorkspaceScope, 'selectBoard'>;
