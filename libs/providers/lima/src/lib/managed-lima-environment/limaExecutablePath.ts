// #region Imports

import { join } from 'node:path';
import { LIMA_VERSION } from './LimaVersion';

// #endregion

export function limaExecutablePath(runtimeRoot: string, architecture: 'arm64' | 'x64'): string {
  return join(runtimeRoot, 'tools', `lima-${LIMA_VERSION}-${architecture}`, 'bin', 'limactl');
}
