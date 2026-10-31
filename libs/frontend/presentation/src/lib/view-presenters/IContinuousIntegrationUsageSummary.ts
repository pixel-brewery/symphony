export interface IContinuousIntegrationUsageSummary {
  readonly accountLabel: string;
  readonly error?: string;
  readonly included?: number;
  readonly remaining?: number;
  readonly remainingPercent?: number;
  readonly resetsAt?: string;
  readonly used?: number;
}
