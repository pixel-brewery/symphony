/** Reuses the shared snapshot reconciliation and mutation replay. @public */
export interface IExecutionRefresh {
  refresh(force?: boolean): Promise<void>;
  repeatAfterActiveRefresh(): () => void;
}
