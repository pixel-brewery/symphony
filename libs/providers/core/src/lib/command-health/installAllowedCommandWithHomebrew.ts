// #region Imports

import { toolchainSearchPath } from '../toolchain-environment';
import type { ICommandHealth } from './ICommandHealth';
import type { InstallableCommand } from './InstallableCommand';
import { execFileAsync } from './ExecFileAsync';
import { homebrewInstallationArguments } from './homebrewInstallationArguments';
import { inspectAllowedCommand } from './inspectAllowedCommand';
import { resolveAllowedCommand } from './resolveAllowedCommand';

// #endregion

export async function installAllowedCommandWithHomebrew(
  command: InstallableCommand,
  signal?: AbortSignal,
): Promise<ICommandHealth> {
  if ((await inspectAllowedCommand(command)).available) {
    throw new Error(`${command} is already installed.`);
  }
  if (!(await inspectAllowedCommand('brew')).available) {
    throw new Error('Homebrew is not installed.');
  }
  try {
    await execFileAsync(resolveAllowedCommand('brew'), homebrewInstallationArguments(command), {
      env: homebrewEnvironment(),
      maxBuffer: 1024 * 1024,
      signal,
      timeout: 15 * 60_000,
      windowsHide: true,
    });
  } catch {
    throw new Error(`Homebrew could not install ${command}.`);
  }
  const health = await inspectAllowedCommand(command);
  if (!health.available) {
    throw new Error(`${command} was installed, but Symphony cannot find the command.`);
  }
  return health;
}

function homebrewEnvironment(environment: NodeJS.ProcessEnv = process.env): NodeJS.ProcessEnv {
  const result: NodeJS.ProcessEnv = {
    HOMEBREW_NO_ANALYTICS: '1',
    HOMEBREW_NO_AUTO_UPDATE: '1',
    HOMEBREW_NO_ENV_HINTS: '1',
  };
  for (const name of ['HOME', 'LANG', 'LC_ALL', 'LOGNAME', 'SHELL', 'TMPDIR', 'USER']) {
    if (environment[name]) result[name] = environment[name];
  }
  result['PATH'] = toolchainSearchPath(environment);
  return result;
}
