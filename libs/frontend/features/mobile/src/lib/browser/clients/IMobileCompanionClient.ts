/** Browser transport and environment contract used by the mobile companion state. */
export interface IMobileCompanionClient {
  // #region Methods

  /** Reads a route and returns its unvalidated response body. */
  request(
    route: string,
    method?: 'GET' | 'POST',
    body?: unknown,
  ): Promise<{ readonly ok: boolean; readonly status: number; readonly body: unknown }>;

  /** Connects the mobile event stream and returns a close callback. */
  connectEvents(
    route: string,
    handlers: {
      readonly open: () => void;
      readonly message: (data: unknown) => void;
      readonly close: () => void;
    },
  ): () => void;

  /** Returns the pairing challenge carried by the current URL fragment. */
  pairingChallenge(): string | undefined;

  /** Removes the pairing challenge from the visible URL. */
  clearPairingChallenge(): void;

  /** Returns a human-readable name for the current mobile device. */
  deviceName(): string;

  /** Creates an operation identifier for cancellable mobile work. */
  createOperationId(): string;

  /** Schedules a bounded retry. */
  schedule(callback: () => void, delayMilliseconds: number): number;

  /** Cancels a scheduled retry. */
  cancel(scheduleId: number): void;

  // #endregion
}
