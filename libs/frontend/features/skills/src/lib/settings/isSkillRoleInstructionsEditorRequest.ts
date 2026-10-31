// #region Imports

import type { ISkillRoleInstructionsEditorRequest } from './ISkillRoleInstructionsEditorRequest';

// #endregion

/**
 * Validates a request for a process role's instructions sheet.
 *
 * @param request - The editor request.
 * @public
 */
export function isSkillRoleInstructionsEditorRequest(
  request: unknown,
): request is ISkillRoleInstructionsEditorRequest {
  if (typeof request !== 'object' || request === null) return false;
  const candidate = request as { kind?: unknown; role?: unknown };
  return (
    candidate.kind === 'skill-role-instructions' &&
    typeof candidate.role === 'string' &&
    candidate.role.length > 0
  );
}
