// #region Imports

import type { ICiRun } from '@symphony/domain-ci';

// #endregion

export function actionMessage(
  run: ICiRun,
  repositoryNames: Readonly<Record<string, string>>,
): string {
  const repository = repositoryNames[run.repositoryBindingId] ?? run.repositoryBindingId;
  return run.branch ? `${repository} · ${run.branch}` : repository;
}
