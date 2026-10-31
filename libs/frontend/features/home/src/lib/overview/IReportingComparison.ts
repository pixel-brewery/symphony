/**
 * A reporting figure for the selected period and, when history covers it, the period before.
 *
 * @public
 */
export interface IReportingComparison {
  /** Value in the selected period. @public @readonly */
  readonly current: number;
  /** Value in the previous period of the same length; absent without enough history. @public @readonly */
  readonly previous?: number;
}
