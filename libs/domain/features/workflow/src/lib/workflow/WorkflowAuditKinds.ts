export const workflowAuditKinds = [
  'stage-changed',
  'run-reported',
  'human-decided',
  'retry-scheduled',
  'resumed',
  'blocked',
  'escalated',
  'quarantined',
  'closed',
  'guard-rejected',
] as const;
