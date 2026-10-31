// #region Imports

import { createHash } from 'node:crypto';
import type { ManagedLimaInstancePrefix } from './ManagedLimaInstancePrefix';

// #endregion

export function limaInstanceName(prefix: ManagedLimaInstancePrefix, key: string): string {
  const digest = createHash('sha256').update(key).digest('hex');
  return `${prefix}-${digest.slice(0, VM_NAME_DIGEST_LENGTH)}`;
}

const VM_NAME_DIGEST_LENGTH = 16;
