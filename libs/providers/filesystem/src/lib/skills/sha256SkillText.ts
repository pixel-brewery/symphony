// #region Imports

import { createHash } from 'node:crypto';

// #endregion

/**
 * Applies the existing synchronous SHA-256 UTF-8 encoding at the host boundary.
 *
 * @public
 */
export function sha256SkillText(text: string): string {
  return createHash('sha256').update(text).digest('hex');
}
