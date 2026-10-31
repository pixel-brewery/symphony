export type ExecutionEventKind =
  | 'execution.started'
  | 'workspace.prepared'
  | 'agent.progress'
  | 'analysis.completed'
  | 'solution.started'
  | 'solver.progress'
  | 'solution.completed'
  | 'pull-request.created'
  | 'execution.cancelled'
  /**
   * A problem that was recorded but did not end the run - a note that could not be published, a
   * claim lease that will be renewed again. It must stay separate from `execution.failed`, which
   * every reader treats as the terminal outcome of the execution.
   */
  | 'execution.warning'
  | 'execution.failed';
