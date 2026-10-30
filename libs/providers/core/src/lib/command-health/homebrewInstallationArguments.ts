// #region Imports

import type { InstallableCommand } from './InstallableCommand';

// #endregion

export function homebrewInstallationArguments(command: InstallableCommand): readonly string[] {
  switch (command) {
    case 'git':
      return ['install', 'git'];
    case 'gh':
      return ['install', 'gh'];
    case 'codex':
      return ['install', '--cask', 'codex'];
    case 'claude':
      return ['install', '--cask', 'claude-code'];
    case 'opencode':
      return ['install', 'anomalyco/tap/opencode'];
  }
}
