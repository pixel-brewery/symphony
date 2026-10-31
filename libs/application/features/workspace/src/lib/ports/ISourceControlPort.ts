// #region Imports

import type { ISourceControlRepository } from './ISourceControlRepository';

// #endregion

export interface ISourceControlPort {
  listRepositories(): Promise<readonly ISourceControlRepository[]>;
}
