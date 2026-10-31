// #region Imports

import { ACTIONS_RUNNER_VERSION } from './ActionsRunnerVersion';

// #endregion

export const actionsRunnerAssets = {
  arm64: {
    archive: `actions-runner-linux-arm64-${ACTIONS_RUNNER_VERSION}.tar.gz`,
    sha256: '58b758e420b87093fbd4bfddd368074960053e2f1388f01848c82624b90f27d1',
  },
  x64: {
    archive: `actions-runner-linux-x64-${ACTIONS_RUNNER_VERSION}.tar.gz`,
    sha256: '04cf0be1aff4c3ec3554466c39124ca250e3effd8873bb7e8d68535aa9505d5d',
  },
} as const;
