// #region Imports

import type { IWorkspaceRouteCandidateView } from './IWorkspaceRouteCandidateView';
import type { Settings } from './Settings';

// #endregion

export interface IWorkspaceRouteView {
  readonly id: string;
  readonly displayName: string;
  readonly strategy: Settings['agentRoutePolicies'][number]['strategy'];
  readonly costPolicy: Settings['agentRoutePolicies'][number]['costPolicy'];
  readonly sessionAffinity: boolean;
  readonly maxParallelExecutions: number;
  readonly candidates: readonly IWorkspaceRouteCandidateView[];
}
