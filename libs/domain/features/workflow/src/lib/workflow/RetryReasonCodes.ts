export const retryReasonCodes = [
  'provider-timeout',
  'model-timeout',
  'rate-limit',
  'temporary-network-error',
  'ci-infrastructure-unavailable',
  'worker-crash',
  'transient-tool-error',
] as const;
