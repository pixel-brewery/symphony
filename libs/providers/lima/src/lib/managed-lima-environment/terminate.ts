// #region Imports

import { type ChildProcess } from 'node:child_process';

// #endregion

export function terminate(child: ChildProcess | undefined): void {
  if (!child?.pid) return;
  try {
    process.kill(-child.pid, 'SIGTERM');
  } catch {
    try {
      child.kill('SIGTERM');
    } catch {
      // The runner process already exited.
    }
  }
}
