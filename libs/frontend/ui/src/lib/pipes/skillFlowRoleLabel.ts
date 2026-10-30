/** Formats the existing process-role label used by the reusable pipe. @internal */
export function skillFlowRoleLabel(role: string): string {
  switch (role) {
    case 'work-item-creation':
      return 'Create tickets';
    case 'analysis':
      return 'Plan work';
    case 'solution':
      return 'Implement changes';
    case 'ci-diagnosis':
      return 'Investigate failed checks';
    case 'ci-repair':
      return 'Repair failed checks';
    case 'pull-request-review':
      return 'Review changes';
    default:
      return role;
  }
}
