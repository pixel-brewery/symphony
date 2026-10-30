export interface IGitHubRateLimitSnapshot {
  readonly cost?: number;
  readonly limit?: number;
  readonly remaining?: number;
  readonly resetAt?: string;
}
