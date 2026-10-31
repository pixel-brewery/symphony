/**
 * Work items that reached Done in one calendar week.
 *
 * @public
 */
export interface IWeeklyDeliveryCount {
  /** ISO week number, as the axis labels it (`W44`). @public @readonly */
  readonly week: number;
  /** Monday of that week (ISO date). @public @readonly */
  readonly startsOn: string;
  /** Work items moved to Done that week; absent for a week the stage history does not cover. @public @readonly */
  readonly count?: number;
  /** Whether it is the current week, which the chart emphasises. @public @readonly */
  readonly current: boolean;
}
