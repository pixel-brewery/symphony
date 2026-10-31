// #region Imports

import type { Settings } from './Settings';

// #endregion

export interface IWorkspaceRouteCandidateView {
  readonly id: string;
  readonly priority: number;
  readonly displayName: string;
  readonly accountProvider: Settings['connections'][number]['kind'] | undefined;
  readonly providerId: string;
  readonly model: string | null;
  readonly reasoningEffort: string | null;
  readonly qualityScore: number;
  readonly costClass: Settings['agentRoutePolicies'][number]['candidates'][number]['costClass'];
  readonly enabled: boolean;
}
