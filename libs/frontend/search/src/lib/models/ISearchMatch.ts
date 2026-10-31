/**
 * A destination selected by one feature's current data projection.
 *
 * @public
 */
export interface ISearchMatch {
  readonly path: string;
  readonly queryParams: Readonly<Record<string, string>>;
}
