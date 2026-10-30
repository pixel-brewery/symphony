export interface IArtificialAnalysisModelIntelligenceOptions {
  /** Accessor so key rotation applies without restarting; the key never appears in errors. */
  readonly apiKey: () => string | undefined;
  readonly fetch?: typeof globalThis.fetch;
  readonly baseUrl?: string;
  readonly cacheTtlMilliseconds?: number;
  readonly now?: () => number;
}
