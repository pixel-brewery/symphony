/**
 * One stage cluster around the Orbit's destination: the work items of one board column, or the
 * work items that need attention, which leave their column for this cluster.
 *
 * @public
 */
export interface IOrbitCluster {
  /** Stable cluster id: `attention` or `column:<board column id>`. @public @readonly */
  readonly id: string;
  /** Whether the cluster gathers attention items or one board column. @public @readonly */
  readonly kind: 'attention' | 'column';
  /** Board column label, or `Needs attention`. @public @readonly */
  readonly label: string;
  /** Board column the cluster stands for; absent for the attention cluster. @public @readonly */
  readonly columnId?: string;
  /** Danger for attention, success for a column of a terminal stage, otherwise neutral. @public @readonly */
  readonly tone: 'neutral' | 'success' | 'danger';
  /** Member work-item ids, newest identifier first. @public @readonly */
  readonly memberIds: readonly string[];
}
