// #region Imports

import { join } from 'node:path';
import { accessSync, constants } from 'node:fs';
import { toolchainDirectories } from './toolchainDirectories';

// #endregion

/** Absolute path of an executable, or `undefined` when the toolchain is not installed. */
export function resolveToolchainExecutable(
  executable: string,
  environment: NodeJS.ProcessEnv = process.env,
): string | undefined {
  if (process.platform === 'win32' || /[/\\]/u.test(executable)) return undefined;
  for (const directory of toolchainDirectories(environment)) {
    const candidate = join(directory, executable);
    try {
      accessSync(candidate, constants.X_OK);
      return candidate;
    } catch {
      // Continue through the remaining search directories.
    }
  }
  return undefined;
}
