export interface IAgentRouteTelemetry {
  readonly workspaceId: string;
  readonly routeCandidateId: string;
  readonly attemptCount: number;
  readonly successCount: number;
  readonly failureCount: number;
  readonly consecutiveFailures: number;
  readonly averageLatencyMilliseconds?: number;
  readonly lastAttemptAt?: string;
  readonly lastSuccessAt?: string;
  readonly lastFailureAt?: string;
  readonly circuitOpenUntil?: string;
}
