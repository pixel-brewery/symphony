// #region Imports

import type { AiRuntimeKind } from '@symphony/frontend-core/ai';

// #endregion

export const AI_RUNTIME_LABELS: Readonly<Record<AiRuntimeKind, string>> = {
  codex: 'Codex',
  claude: 'Claude Code',
  opencode: 'OpenCode',
};
