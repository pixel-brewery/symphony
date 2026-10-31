// #region Imports

import type { ISkillEditorRequest } from './ISkillEditorRequest';

// #endregion

/**
 * Validates a request for the skill package sheet.
 *
 * @param request - The editor request.
 * @public
 */
export function isSkillEditorRequest(request: unknown): request is ISkillEditorRequest {
  if (typeof request !== 'object' || request === null) return false;
  const candidate = request as { kind?: unknown; mode?: unknown; skillId?: unknown };
  if (candidate.kind !== 'skill-editor') return false;
  return (
    candidate.mode === 'create' ||
    (candidate.mode === 'edit' && typeof candidate.skillId === 'string' && !!candidate.skillId)
  );
}
