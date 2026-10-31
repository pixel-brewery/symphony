/**
 * Exposes an admitted operation's existing cancellation and completion handles.
 *
 * @public
 */
export interface IActiveOperation {
  readonly controller: AbortController;
  readonly completion: Promise<unknown>;
}
