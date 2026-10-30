// #region Imports

import type { ICommandHealth } from './ICommandHealth';
import { execFileAsync } from './ExecFileAsync';
import { resolveAllowedCommand } from './resolveAllowedCommand';
import { toolchainSearchPath } from '../toolchain-environment/toolchainSearchPath';

// #endregion

/**
 * Checks an installed developer command using the same effective PATH as its runtime callers.
 *
 * @param command - Developer command permitted for a version diagnostic.
 * @param environment - Host environment with the installation roots to preserve.
 * @returns Availability and the version reported by the executable.
 * @public
 */
export async function inspectAllowedCommand(
  command: 'brew' | 'git' | 'codex' | 'gh' | 'claude' | 'opencode',
  environment: NodeJS.ProcessEnv = process.env,
): Promise<ICommandHealth> {
  const args = allowedDiagnostics.get(command);
  if (!args) {
    return { available: false };
  }
  try {
    const { stdout } = await execFileAsync(resolveAllowedCommand(command, environment), args, {
      env: { ...environment, PATH: toolchainSearchPath(environment) },
      // A freshly installed CLI can perform one-time startup work before printing its version.
      // Keep this bounded, but do not misclassify that cold start as a missing command.
      timeout: 10_000,
      windowsHide: true,
    });
    return { available: true, version: stdout.trim() };
  } catch {
    return { available: false };
  }
}

const allowedDiagnostics = new Map([
  ['brew', ['--version']],
  ['git', ['--version']],
  ['codex', ['--version']],
  ['gh', ['--version']],
  ['claude', ['--version']],
  ['opencode', ['--version']],
]);
