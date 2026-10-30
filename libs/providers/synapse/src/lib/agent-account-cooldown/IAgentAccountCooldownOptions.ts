export interface IAgentAccountCooldownOptions {
  readonly now?: () => Date;
  readonly rateLimitCooldownMilliseconds?: number;
  readonly quotaCooldownMilliseconds?: number;
  readonly maximumCooldownMilliseconds?: number;
  readonly onPersistenceError?: (cause: unknown) => void;
}
