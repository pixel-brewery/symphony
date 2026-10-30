/**
 * Exposes the existing reconciliation sequence without sharing the synchronizer's state.
 *
 * @public
 */
export interface IWorkRefresh {
  /** Reconciles the current aggregate through the existing refresh owner. @public */
  refresh(): Promise<void>;
  /** Captures an already-active refresh and returns its post-mutation replay callback. @public */
  repeatAfterActiveRefresh(): () => void;
}
