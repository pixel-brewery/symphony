/** A slot's unchanged one-based placement in the existing six-by-four mosaic. @public */
export interface IWidgetTilePlacement {
  readonly column: number;
  readonly row: number;
  readonly columns: 1 | 2;
  readonly rows: 1 | 2;
}
