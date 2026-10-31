// #region Imports

import type { SkillTextDigest } from '../SkillTextDigest';

// #endregion

/** Content-addressed revision of one analysis text, recorded on the workflow record. */
export function analysisRevisionOf(analysis: string, digest: SkillTextDigest): string {
  return digest(analysis).slice(0, 12);
}
