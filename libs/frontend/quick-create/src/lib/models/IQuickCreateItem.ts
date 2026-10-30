/**
 * A feature-owned existing authoring action, including its visible unavailable explanation.
 *
 * @public
 */
export interface IQuickCreateItem {
  readonly id: string;
  readonly navigationItemKey: string;
  readonly label: string;
  readonly testId: string;
  readonly route: string;
  readonly disabled: boolean;
  readonly tooltip: string;
}
