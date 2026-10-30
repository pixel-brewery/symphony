// #region Imports

import type { IRailRun } from './IRailRun';

// #endregion

/** Selects the three menu-bar entries that best explain one run category. */
export function selectMenuBarRuns(
  runs: readonly IRailRun[],
  category: 'agent' | 'actions',
): readonly IRailRun[] {
  const matching = runs.filter((run) =>
    category === 'agent' ? run.kind === 'agent' : run.kind !== 'agent',
  );
  return [...matching.filter((run) => run.active), ...matching.filter((run) => !run.active)].slice(
    0,
    3,
  );
}
