/** Store capabilities required while the Board route enters its initial presentation. */
export interface IBoardRouteStore {
  /** Returns the durable orchestration snapshot when one is already available. */
  snapshot(): unknown;

  /** Starts or joins global renderer initialization. */
  initialize(): Promise<void>;

  /**
   * Refreshes the orchestration snapshot.
   *
   * @param force - Whether providers are queried instead of the local cache; defaults to `true`.
   */
  refresh(force?: boolean): Promise<void>;
}
