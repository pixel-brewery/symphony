export interface IAgentModelLockoutOptions {
  readonly now?: () => number;
  readonly availableCacheMilliseconds?: number;
  readonly unavailableCacheMilliseconds?: number;
  readonly unknownCacheMilliseconds?: number;
  readonly onInspectionError?: (cause: unknown) => void;
}
