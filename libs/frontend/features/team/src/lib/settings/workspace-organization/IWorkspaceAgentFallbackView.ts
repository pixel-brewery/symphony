// #region Imports

import type { Settings } from './Settings';

// #endregion

/** One configured backup route, shown next to the preferred provider on the agent card. */
export interface IWorkspaceAgentFallbackView {
  readonly accountId: string;
  readonly accountDisplayName: string;
  readonly accountKind: Extract<
    Settings['connections'][number]['kind'],
    'codex' | 'claude' | 'opencode'
  >;
  readonly model?: string;
  readonly reasoningEffort?: string;
}
