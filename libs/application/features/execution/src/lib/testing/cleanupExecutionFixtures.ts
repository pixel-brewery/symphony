// #region Imports

import { rmSync } from 'node:fs';
import { executionFixtureDirectories } from './ExecutionFixtureDirectories';

// #endregion

/** Removes directories created by the shared execution integration fixture. @public */
export function cleanupExecutionFixtures(): void {
  for (const directory of executionFixtureDirectories.splice(0)) {
    rmSync(directory, { recursive: true, force: true });
  }
}
