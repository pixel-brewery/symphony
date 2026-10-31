/**
 * A feature-owned route phrase in the global search's established priority order.
 *
 * @public
 */
export interface ISearchRouteAlias {
  readonly term: string;
  readonly path: string;
  readonly order: number;
}
