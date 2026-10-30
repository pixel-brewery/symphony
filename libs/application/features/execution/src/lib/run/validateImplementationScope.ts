// #region Imports

import type { IImplementationContract } from '@symphony/domain-execution';
import { matchesPathPattern } from '../analyzer/matchesPathPattern';

// #endregion

export function validateImplementationScope(
  contract: IImplementationContract,
  changeSet: { readonly changedFiles: readonly string[]; readonly diffLines: number },
): readonly string[] {
  const failures: string[] = [];
  const outsideScope = changeSet.changedFiles.filter(
    (path) =>
      !contract.allowedPathPatterns.some((pattern) => matchesPathPattern(path, pattern)) ||
      contract.forbiddenPathPatterns.some((pattern) => matchesPathPattern(path, pattern)),
  );
  if (outsideScope.length) {
    failures.push(`Changed files outside the implementation contract: ${outsideScope.join(', ')}.`);
  }
  if (changeSet.changedFiles.length > contract.maximumChangedFiles) {
    failures.push(
      `The implementation changed ${changeSet.changedFiles.length} files; the contract allows ${contract.maximumChangedFiles}.`,
    );
  }
  if (changeSet.diffLines > contract.maximumDiffLines) {
    failures.push(
      `The implementation changed ${changeSet.diffLines} diff lines; the contract allows ${contract.maximumDiffLines}.`,
    );
  }
  return failures;
}
