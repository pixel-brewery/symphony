// --------------------------------------------------------------------------------------
// Guards
// --------------------------------------------------------------------------------------

/**
 * Guard identifiers are a closed union because each one is a code predicate. A workflow
 * definition composes them per transition; it cannot invent new ones from configuration.
 */
export const workflowGuardIds = [
  'authorized-human-approval',
  'required-fields-complete',
  'no-open-question',
  'not-duplicate',
  'not-cancelled',
  'analysis-complete',
  'analysis-feasible',
  'analysis-revision-current',
  'test-strategy-present',
  'acceptance-mapping-complete',
  'claim-acquired',
  'lease-active',
  'fencing-token-current',
  'dependencies-satisfied',
  'no-hard-collision',
  'capacity-available',
  'risk-policy-satisfied',
  'pull-request-exists',
  'continuous-integration-passed',
  'verification-passed',
  'verified-commit-current',
  'issue-revision-current',
  'no-open-findings',
  'authorized-human-acceptance',
  'accepted-commit-current',
  'merge-successful',
  'target-branch-contains-commit',
  'post-merge-checks-passed',
  'audit-complete',
] as const;
