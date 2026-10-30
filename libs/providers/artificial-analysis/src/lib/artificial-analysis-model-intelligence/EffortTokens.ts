export /** Reasoning-effort markers Artificial Analysis appends to variant names, e.g. "GPT-5.6 Sol (high)". */
const EFFORT_TOKENS: ReadonlySet<string> = new Set([
  'minimal',
  'low',
  'medium',
  'high',
  'xhigh',
  'max',
]);
