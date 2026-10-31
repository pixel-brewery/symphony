/**
 * Agent runs started in the selected period and the period before.
 *
 * @public
 */
export interface IAgentRunFigures {
  /** Runs started in the selected period. @public @readonly */
  readonly current: number;
  /** Runs started in the previous period. @public @readonly */
  readonly previous: number;
  /** Runs of the selected period that succeeded at their first attempt without a pause. @public @readonly */
  readonly withoutIntervention: number;
}
