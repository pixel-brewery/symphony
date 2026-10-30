// #region Imports

import { win32 as windowsPath } from 'node:path';
import type { SquirrelStartupAction } from './SquirrelStartupAction';

// #endregion

export function resolveSquirrelStartupAction(
  platform: NodeJS.Platform,
  command: string | undefined,
  execPath: string,
): SquirrelStartupAction | undefined {
  if (platform !== 'win32') return undefined;
  const target = windowsPath.basename(execPath);
  const executable = windowsPath.resolve(windowsPath.dirname(execPath), '..', 'Update.exe');
  switch (command) {
    case '--squirrel-install':
    case '--squirrel-updated':
      return { kind: 'run-update', executable, arguments: [`--createShortcut=${target}`] };
    case '--squirrel-uninstall':
      return { kind: 'run-update', executable, arguments: [`--removeShortcut=${target}`] };
    case '--squirrel-obsolete':
      return { kind: 'quit' };
    default:
      return undefined;
  }
}
