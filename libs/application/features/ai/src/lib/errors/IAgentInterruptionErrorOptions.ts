export interface IAgentInterruptionErrorOptions extends ErrorOptions {
  readonly retryAt?: string;
  readonly recoveryMessage?: string;
}
