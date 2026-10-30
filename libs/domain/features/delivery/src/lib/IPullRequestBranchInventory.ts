// #region Imports

import type { ISourceControlBranch } from './ISourceControlBranch';

// #endregion

/**
 * Branches one repository offers as the source or the target of a new pull request.
 *
 * @public
 */
export interface IPullRequestBranchInventory {
  repositoryBindingId: string;
  defaultBranch: string;
  branches: readonly ISourceControlBranch[];
}
