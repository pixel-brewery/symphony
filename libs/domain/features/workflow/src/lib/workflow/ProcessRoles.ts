/**
 * Built-in process roles. A role owns *how* a step is performed; the workflow definition
 * owns *when* it runs and what its result may change.
 */
export const processRoles = [
  'create',
  'analyze',
  'solve',
  'verify',
  'ci-diagnosis',
  'ci-repair',
  'pull-request-review',
] as const;
