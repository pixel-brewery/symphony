// #region Imports
import { translateLabel } from '@symphony/frontend-intl/labels';

// #endregion

/** Formats the existing process-role label used by the reusable pipe. @internal */
export function skillFlowRoleLabel(role: string): string {
  switch (role) {
    case 'work-item-creation':
      return translateLabel('loc.symphony.labels.create.tickets.3b5d4bb');
    case 'analysis':
      return translateLabel('loc.symphony.labels.plan.work.43bd5e0');
    case 'solution':
      return translateLabel('loc.symphony.labels.implement.changes.69089c0');
    case 'ci-diagnosis':
      return translateLabel('loc.symphony.labels.investigate.failed.checks.5eb7d89');
    case 'ci-repair':
      return translateLabel('loc.symphony.labels.repair.failed.checks.34d029c');
    case 'pull-request-review':
      return translateLabel('loc.symphony.labels.review.changes.6a47708');
    default:
      return role;
  }
}
