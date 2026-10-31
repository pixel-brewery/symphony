// #region Imports

import type { IAgenticRung } from './IAgenticRung';

// #endregion

/**
 * The eight agentic switches in dependency order, as the `Fix failed checks` rail draws them. The
 * dependencies follow what the orchestrator checks: nothing runs without the feature and the
 * failure observation; reruns, AI diagnosis and branch updates build on the recorded failures;
 * a repair needs the diagnosis and branch updates; a replacement pull request needs a repair.
 *
 * @public
 */
export const agenticLadder: readonly IAgenticRung[] = [
  { key: 'enabled', requires: [], requiresAnyOf: [] },
  { key: 'observeFailures', requires: ['enabled'], requiresAnyOf: [] },
  { key: 'aiDiagnosisEnabled', requires: ['observeFailures'], requiresAnyOf: [] },
  { key: 'ciRerunEnabled', requires: ['observeFailures'], requiresAnyOf: [] },
  { key: 'managedBranchUpdatesEnabled', requires: ['observeFailures'], requiresAnyOf: [] },
  {
    key: 'sourceRepairEnabled',
    requires: ['managedBranchUpdatesEnabled', 'aiDiagnosisEnabled'],
    requiresAnyOf: [],
  },
  {
    key: 'workflowRepairEnabled',
    requires: ['managedBranchUpdatesEnabled', 'aiDiagnosisEnabled'],
    requiresAnyOf: [],
  },
  {
    key: 'replacementPullRequestEnabled',
    requires: [],
    requiresAnyOf: ['sourceRepairEnabled', 'workflowRepairEnabled'],
  },
];
