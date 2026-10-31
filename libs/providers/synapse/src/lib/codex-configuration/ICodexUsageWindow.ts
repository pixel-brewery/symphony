export interface ICodexUsageWindow {
  readonly usedPercent: number;
  readonly remainingPercent: number;
  readonly windowDurationMinutes?: number;
  readonly resetsAt?: string;
}
