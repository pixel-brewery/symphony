export interface ILoopLimitPolicy {
  readonly maxReworkPerRoute: number;
  readonly maxReworkTotal: number;
  readonly maxIdenticalFailures: number;
  readonly maxDurationHours: number;
}
