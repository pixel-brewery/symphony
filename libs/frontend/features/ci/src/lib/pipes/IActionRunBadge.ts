/**
 * How a run's result badge looks: its word and its Mosaik variant and appearance.
 *
 * @public
 */
export interface IActionRunBadge {
  /** `Passed`, `Failed`, `Cancelled`, `Queued` or `Running`. @public @readonly */
  readonly label: string;
  /** Badge variant. @public @readonly */
  readonly variant: 'default' | 'danger' | 'success' | 'info' | 'primary';
  /** Badge appearance. @public @readonly */
  readonly appearance: 'soft' | 'outline';
}
