/**
 * What the operator can do with one run row.
 *
 * @public
 */
export interface IActionRunControls {
  /** `View log` opens the Action drawer. @public @readonly */
  readonly canViewLog: boolean;
  /** `Stop` ends a running run on GitHub or on the local runner. @public @readonly */
  readonly canStop: boolean;
  /** `Cancel` withdraws a queued GitHub run. @public @readonly */
  readonly canCancel: boolean;
  /** `Rerun on GitHub` starts the finished run again. @public @readonly */
  readonly canRerun: boolean;
  /** `Run locally` repeats the run on the managed local runner. @public @readonly */
  readonly canRunLocally: boolean;
  /** `Open in GitHub` opens the run page. @public @readonly */
  readonly canOpenInGitHub: boolean;
}
