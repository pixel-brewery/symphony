// #region Imports

import type { ISourceControlBranch } from '@symphony/domain-delivery';

// #endregion

/**
 * Branch pair a repository opens with: its default branch as the target, and the first other
 * branch as the source, so the drawer starts on a comparable selection.
 */
export function resolveInitialBranchSelection(
  branches: readonly ISourceControlBranch[],
  defaultBranch: string,
): { readonly targetBranch: string; readonly sourceBranch: string } {
  const targetBranch = branches.some((branch) => branch.name === defaultBranch)
    ? defaultBranch
    : (branches[0]?.name ?? '');
  const sourceBranch = branches.find((branch) => branch.name !== targetBranch)?.name ?? '';
  return { targetBranch, sourceBranch };
}
