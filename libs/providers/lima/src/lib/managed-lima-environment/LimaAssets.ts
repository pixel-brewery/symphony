// #region Imports

import { LIMA_VERSION } from './LimaVersion';

// #endregion

export const limaAssets = {
  arm64: {
    archive: `lima-${LIMA_VERSION}-Darwin-arm64.tar.gz`,
    sha256: 'bbdef91774885a0d05f7b048c4eb89ae2bcf3a0c252ae7ca7934e63df76d93c3',
  },
  x64: {
    archive: `lima-${LIMA_VERSION}-Darwin-x86_64.tar.gz`,
    sha256: '0d6f99c19f6e4bc3c92730c4c29d929e6927f0cb0a0ba1a84383367135a8ff31',
  },
} as const;
