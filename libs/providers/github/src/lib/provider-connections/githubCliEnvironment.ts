// #region Imports

import { toolchainSearchPath } from '@symphony/providers-core';

// #endregion

export function githubCliEnvironment(): NodeJS.ProcessEnv {
  const environment: NodeJS.ProcessEnv = {};
  for (const name of [
    'HOME',
    'LANG',
    'LC_ALL',
    'SHELL',
    'TMPDIR',
    'GH_CONFIG_DIR',
    'XDG_CONFIG_HOME',
  ] as const) {
    if (process.env[name]) environment[name] = process.env[name];
  }
  environment['PATH'] = toolchainSearchPath();
  return environment;
}
