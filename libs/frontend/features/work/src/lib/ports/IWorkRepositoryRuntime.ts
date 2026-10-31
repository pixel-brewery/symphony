// #region Imports

import type { IRepositoryRuntimeOperations } from '@symphony/frontend-core/workspace';

// #endregion

/** The actual optional participant consumed by Work, without another state owner. @public */
export type IWorkRepositoryRuntime = Pick<
  IRepositoryRuntimeOperations,
  'repositoryRuntimeStatus' | 'refreshRepositoryRuntime' | 'prepareRepository'
>;
