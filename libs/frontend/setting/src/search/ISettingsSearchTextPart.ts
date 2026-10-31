/**
 * A piece of a label, marked when it matches a search word.
 *
 * @public
 */
export interface ISettingsSearchTextPart {
  /**
   * The text of the piece.
   *
   * @public
   * @readonly
   */
  readonly text: string;
  /**
   * Whether the piece matches a word of the query.
   *
   * @public
   * @readonly
   */
  readonly match: boolean;
}
