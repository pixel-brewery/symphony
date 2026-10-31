// #region Imports

import { skillFlowRoles } from '@symphony/domain-skills';
import type { ISkillCatalogEditorRequest } from './ISkillCatalogEditorRequest';

// #endregion

/**
 * Validates a request for the `Add skills` sheet.
 *
 * @param request - The editor request.
 * @public
 */
export function isSkillCatalogEditorRequest(
  request: unknown,
): request is ISkillCatalogEditorRequest {
  if (typeof request !== 'object' || request === null) return false;
  const candidate = request as { kind?: unknown; role?: unknown };
  return (
    candidate.kind === 'skill-catalog' &&
    (candidate.role === undefined || skillFlowRoles.some((role) => role === candidate.role))
  );
}
