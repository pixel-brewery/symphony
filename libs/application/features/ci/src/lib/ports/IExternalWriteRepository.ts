// #region Imports

import type { IExternalWriteOperation } from '@symphony/domain-ci';

// #endregion

/** @public */
export interface IExternalWriteRepository {
  list(): readonly IExternalWriteOperation[];
  save(operation: IExternalWriteOperation): void;
}
