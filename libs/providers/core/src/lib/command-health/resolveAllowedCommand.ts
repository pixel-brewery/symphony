// #region Imports

import { toolchainDirectories } from '../toolchain-environment';
import { isAbsolute, join } from 'node:path';
import { platform } from 'node:os';
import { accessSync, constants, statSync } from 'node:fs';
import { codexApplicationCandidates } from './codexApplicationCandidates';
import { registeredCodexApplications } from './registeredCodexApplications';

// #endregion

/**
 * Resolves an allowlisted developer command using the effective toolchain and provider fallbacks.
 *
 * @param command - Developer command permitted by the caller.
 * @param environment - Environment supplying the inherited PATH and installation roots.
 * @returns An executable file path, or the command name for the caller's unavailable-command handling.
 * @public
 */
export function resolveAllowedCommand(
  command: 'brew' | 'git' | 'codex' | 'gh' | 'claude' | 'opencode',
  environment: NodeJS.ProcessEnv = process.env,
): string {
  const names = command === 'codex' && platform() === 'win32' ? ['codex.exe', command] : [command];
  const pathCandidates = toolchainDirectories(environment).flatMap((directory) =>
    names.map((name) => join(directory, name)),
  );
  for (const candidate of [...pathCandidates, ...knownCommandPaths[command]]) {
    if (command === 'opencode' && /\.app[/\\]Contents[/\\]/iu.test(candidate)) continue;
    if (isExecutableFile(candidate)) return candidate;
  }
  if (command === 'codex') {
    const installerDirectories = [
      environment['CODEX_INSTALL_DIR'],
      ...(platform() === 'win32' && environment['LOCALAPPDATA']
        ? [join(environment['LOCALAPPDATA'], 'Programs', 'OpenAI', 'Codex', 'bin')]
        : []),
    ].filter((directory): directory is string => Boolean(directory && isAbsolute(directory)));
    for (const directory of installerDirectories) {
      for (const name of names) {
        const candidate = join(directory, name);
        if (isExecutableFile(candidate)) return candidate;
      }
    }
  }
  if (command === 'codex' && platform() === 'darwin') {
    const applicationDirectories = [
      '/Applications',
      ...(environment['HOME'] ? [join(environment['HOME'], 'Applications')] : []),
    ];
    const applications = applicationDirectories.flatMap((directory) =>
      ['Codex.app', 'ChatGPT.app'].map((name) => join(directory, name)),
    );
    for (const candidate of codexApplicationCandidates(applications)) {
      if (isExecutableFile(candidate)) return candidate;
    }
    for (const candidate of codexApplicationCandidates(registeredCodexApplications())) {
      if (isExecutableFile(candidate)) return candidate;
    }
  }
  if (command === 'opencode') {
    throw new Error('OpenCode CLI is not installed.');
  }
  return command;
}

const knownCommandPaths: Readonly<
  Record<'brew' | 'git' | 'codex' | 'gh' | 'claude' | 'opencode', readonly string[]>
> = {
  brew: ['/opt/homebrew/bin/brew', '/usr/local/bin/brew'],
  git: ['/usr/bin/git', '/opt/homebrew/bin/git', '/usr/local/bin/git'],
  codex: [],
  gh: ['/opt/homebrew/bin/gh', '/usr/local/bin/gh'],
  claude: ['/opt/homebrew/bin/claude', '/usr/local/bin/claude'],
  opencode: ['/opt/homebrew/bin/opencode', '/usr/local/bin/opencode'],
};

function isExecutableFile(candidate: string): boolean {
  try {
    if (!statSync(candidate).isFile()) return false;
    accessSync(candidate, constants.X_OK);
    return true;
  } catch {
    return false;
  }
}
