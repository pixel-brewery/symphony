/**
 * The state a workflow's dot shows in the `WORKFLOWS` list: its latest finished run failed, a run
 * is in progress or queued, its latest finished run passed, or nothing tells either way.
 *
 * @public
 */
export type WorkflowHealth = 'failing' | 'running' | 'passing' | 'idle';
