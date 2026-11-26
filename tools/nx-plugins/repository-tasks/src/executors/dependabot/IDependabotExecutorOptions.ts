/**
 * Selects the trusted dependency workflow operation.
 *
 * @internal
 */
export interface IDependabotExecutorOptions {
  /** The operation whose external mutations must never be cached. */
  readonly mode: 'merge' | 'reconcile' | 'continue';
}
