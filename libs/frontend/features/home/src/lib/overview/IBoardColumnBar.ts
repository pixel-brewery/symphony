/**
 * One board column of the Overview's `Board` chart.
 *
 * @public
 */
export interface IBoardColumnBar {
  /** Board column identifier, as the Board's column filter takes it. @public @readonly */
  readonly id: string;
  /** Column label. @public @readonly */
  readonly label: string;
  /** Work items in the column. @public @readonly */
  readonly count: number;
  /** Bar length relative to the fullest column, in percent. @public @readonly */
  readonly share: number;
}
