// #region Imports

import { ACTIONS_RUNNER_VERSION } from './ActionsRunnerVersion';

// #endregion

export const actionsRunnerAssets = {
  arm64: {
    archive: `actions-runner-linux-arm64-${ACTIONS_RUNNER_VERSION}.tar.gz`,
    sha256: '670adb2f268fe21dcbb58b3db0e0aa9d5b3bddfe2c651481336e561ff86de945',
  },
  x64: {
    archive: `actions-runner-linux-x64-${ACTIONS_RUNNER_VERSION}.tar.gz`,
    sha256: 'baebf204307bac6193480852732f0aba2ae97b6c5597c244f4d5558390147c40',
  },
} as const;
