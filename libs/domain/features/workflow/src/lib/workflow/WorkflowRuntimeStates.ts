/**
 * Runtime state beside the stage. `idle` means the stage holds the item with no active work;
 * every other value describes why automation is not currently progressing.
 */
export const workflowRuntimeStates = [
  'idle',
  'awaiting-human-review',
  'claimed',
  'running',
  'retry-wait',
  'blocked',
  'human-required',
  'quarantined',
  'merge-pending',
  'closed',
] as const;
