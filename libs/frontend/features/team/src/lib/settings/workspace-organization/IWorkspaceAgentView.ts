// #region Imports

import type { IAgentAppearance } from '@symphony/domain-team';
import type { IWorkspaceAgentFallbackView } from './IWorkspaceAgentFallbackView';
import type { Settings } from './Settings';

// #endregion

export interface IWorkspaceAgentView {
  readonly id: string;
  readonly displayName: string;
  readonly appearance?: IAgentAppearance;
  readonly positionDisplayName: string;
  readonly positionDescription: string | undefined;
  readonly enabled: boolean;
  readonly accountId?: string;
  /** Provider the agent's preferred route runs on; drives the provider avatar. */
  readonly accountKind?: Extract<
    Settings['connections'][number]['kind'],
    'codex' | 'claude' | 'opencode'
  >;
  readonly accountDisplayName?: string;
  readonly model?: string;
  readonly reasoningEffort?: string;
  /** Backup routes in priority order; each one is an account the agent falls over to. */
  readonly fallbacks: readonly IWorkspaceAgentFallbackView[];
}
