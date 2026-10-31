// #region Imports

import { spawn } from 'node:child_process';
import type { ISquirrelStartupOptions } from './ISquirrelStartupOptions';
import { resolveSquirrelStartupAction } from './resolveSquirrelStartupAction';

// #endregion

export function handleSquirrelStartup(options: ISquirrelStartupOptions): boolean {
  const action = resolveSquirrelStartupAction(
    options.platform ?? process.platform,
    options.command ?? process.argv[1],
    options.execPath ?? process.execPath,
  );
  if (!action) return false;
  if (action.kind === 'quit') {
    options.quit();
    return true;
  }

  const spawnUpdate =
    options.spawnUpdate ??
    ((executable: string, arguments_: readonly string[]) =>
      spawn(executable, [...arguments_], { detached: true }));
  try {
    const child = spawnUpdate(action.executable, action.arguments);
    let completed = false;
    const quitOnce = (): void => {
      if (completed) return;
      completed = true;
      options.quit();
    };
    child.once('close', quitOnce);
    child.once('error', quitOnce);
  } catch {
    options.quit();
  }
  return true;
}
