// #region Imports

import { createHash } from 'node:crypto';

// #endregion

export function verifySha256(
  bytes: Buffer,
  expected: string,
  message = 'Downloaded Lima archive failed checksum verification.',
): void {
  const actual = createHash('sha256').update(bytes).digest('hex');
  if (actual !== expected) throw new Error(message);
}
