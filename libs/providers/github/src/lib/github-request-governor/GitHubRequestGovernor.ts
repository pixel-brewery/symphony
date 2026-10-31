// #region Imports

import { GitHubRateLimitError } from './GitHubRateLimitError';
import type { IGitHubRateLimitSnapshot } from './IGitHubRateLimitSnapshot';

// #endregion

/** Account-scoped flow control for concurrency and provider-reported request exhaustion. */
export class GitHubRequestGovernor {
  // #region Fields

  private readonly _queue: IQueuedOperation<unknown>[] = [];
  private _active = 0;
  private _blockedUntil = 0;
  private _blockedMessage = 'GitHub API rate limit exhausted.';
  private _snapshotValue: IGitHubRateLimitSnapshot = {};

  // #endregion

  // #region Ctor

  public constructor(private readonly _maximumConcurrency = 4) {}

  // #endregion

  // #region Methods

  /**
   * Runs.
   *
   * @param execute - Execute.
   * @typeParam T - The t type.
   * @public
   */
  public run<T>(execute: () => Promise<T>): Promise<T> {
    const blocked = this.blockedError();
    if (blocked) return Promise.reject(blocked);
    return new Promise<T>((resolve, reject) => {
      this._queue.push({ execute, resolve, reject } as IQueuedOperation<unknown>);
      this.drain();
    });
  }

  /**
   * Returns the observe.
   *
   * @param snapshot - Snapshot.
   * @param exhaustedMessage - Exhausted message.
   * @public
   */
  public observe(
    snapshot: IGitHubRateLimitSnapshot,
    exhaustedMessage = 'GitHub API rate limit exhausted.',
  ): void {
    this._snapshotValue = { ...this._snapshotValue, ...snapshot };
    if (snapshot.remaining === 0 && snapshot.resetAt) {
      this.block(snapshot.resetAt, exhaustedMessage);
    }
  }

  /**
   * Returns the block.
   *
   * @param retryAt - Retry at.
   * @param message - Message.
   * @public
   */
  public block(retryAt: string, message: string): GitHubRateLimitError {
    const parsed = Date.parse(retryAt);
    this._blockedUntil = Number.isFinite(parsed)
      ? Math.max(this._blockedUntil, parsed)
      : Date.now();
    this._blockedMessage = message;
    const error = new GitHubRateLimitError(message, new Date(this._blockedUntil).toISOString());
    for (const operation of this._queue.splice(0)) operation.reject(error);
    return error;
  }

  /**
   * Snapshots.
   *
   * @public
   */
  public snapshot(): IGitHubRateLimitSnapshot {
    return this._snapshotValue;
  }

  private drain(): void {
    const blocked = this.blockedError();
    if (blocked) {
      for (const operation of this._queue.splice(0)) operation.reject(blocked);
      return;
    }
    while (this._active < Math.max(1, this._maximumConcurrency)) {
      const operation = this._queue.shift();
      if (!operation) return;
      this._active += 1;
      void operation
        .execute()
        .then(operation.resolve, operation.reject)
        .finally(() => {
          this._active -= 1;
          this.drain();
        });
    }
  }

  private blockedError(): GitHubRateLimitError | undefined {
    if (this._blockedUntil <= Date.now()) return undefined;
    return new GitHubRateLimitError(
      this._blockedMessage,
      new Date(this._blockedUntil).toISOString(),
    );
  }

  // #endregion
}

interface IQueuedOperation<T> {
  readonly execute: () => Promise<T>;
  readonly resolve: (value: T) => void;
  readonly reject: (cause: unknown) => void;
}
