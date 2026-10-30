export interface IAgentRouteGovernorOptions {
  readonly now?: () => Date;
  readonly failureThreshold?: number;
  readonly cooldownMilliseconds?: number;
  readonly onPersistenceError?: (cause: unknown) => void;
}
