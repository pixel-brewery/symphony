export interface IAiUsageWindow {
  readonly remainingPercent: number;
  readonly resetsAt?: string;
  readonly usedPercent: number;
  readonly windowDurationMinutes?: number;
}
