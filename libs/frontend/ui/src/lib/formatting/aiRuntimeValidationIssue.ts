// #region Imports

import type { AiRuntimeKind } from '@symphony/frontend-core/ai';

// #endregion

/** Maps a missing runtime to the existing account and agent validation issue vocabulary. @public */
export function aiRuntimeValidationIssue(
  kind: AiRuntimeKind,
): 'runtime-codex' | 'runtime-claude' | 'runtime-opencode' {
  return kind === 'codex'
    ? 'runtime-codex'
    : kind === 'claude'
      ? 'runtime-claude'
      : 'runtime-opencode';
}
