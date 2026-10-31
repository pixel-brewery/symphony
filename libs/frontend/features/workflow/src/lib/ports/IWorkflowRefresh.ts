/** Reconciles the shared projection after a human workflow action. @public */
export interface IWorkflowRefresh {
  refresh(): Promise<void>;
}
