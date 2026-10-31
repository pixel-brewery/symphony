// #region Imports

import type { RuntimeHealthDto } from '@symphony/ipc-contracts-platform';
import type { RuntimeDependencyCommand } from './RuntimeDependencyCommand';

// #endregion

export interface IRuntimeDependencyView {
  id: 'homebrew' | 'git' | 'github-cli' | 'codex' | 'claude' | 'opencode';
  health: RuntimeHealthDto['git'];
  installCommand?: RuntimeDependencyCommand;
}
